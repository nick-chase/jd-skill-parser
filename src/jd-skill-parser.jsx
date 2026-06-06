import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as registry from '@core/registry.js';
import { extractTextFromPdf } from './lib/pdfExtract.js';
import { parseResume, extractBehavioralSignals } from './core/parser/parseResume.js';
import { getDecision } from '@core/parser/decision.js';
import SkillRow from './components/SkillRow.jsx';
import { getOrCreateUser, onAuthStateChange } from './lib/auth.js'
import { analytics } from './lib/analytics.js';
import { saveResumeProfile, loadResumeProfile, getUserPlanStatus } from './lib/supabase.js';
import { checkAndIncrementParseCount, FREE_DAILY_LIMIT, isPaid } from './lib/limits.js';
import SignInButton from './components/SignInButton.jsx';
import UserMenu from './components/UserMenu.jsx';
import UpgradePrompt from './components/UpgradePrompt.jsx'
import AdSlot from './components/AdSlot.jsx';
import AppFooter from './components/AppFooter.jsx';
import HowToTour from './components/HowToTour.jsx'
import FeedbackForm from './components/FeedbackForm.jsx';

const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
const betaFeedbackEnabled = import.meta.env.VITE_BETA_FEEDBACK_ENABLED === 'true'

// ============================================================
// CLASSIFICATION SYSTEM
// ============================================================
// Proficiency: OPM 5-Level Scale (federal standard)
// Skill names: Lightcast-style canonical names (industry standard)
// Importance: inferred from JD section structure
// ============================================================

const LEVEL_NAMES = ['—', 'Mentioned', 'Limited evidence', 'Supported', 'Strong evidence', 'Extensive evidence'];
const IMPORTANCE_NAMES = ['—', 'Optional', 'Nice-to-have', 'Preferred', 'Required', 'Critical'];

const IMPORTANCE_STYLES = {
    5: 'bg-rose-50 text-rose-700 border-rose-200',
    4: 'bg-amber-50 text-amber-800 border-amber-200',
    3: 'bg-sky-50 text-sky-700 border-sky-200',
    2: 'bg-slate-100 text-slate-600 border-slate-200',
    1: 'bg-slate-50 text-slate-500 border-slate-200',
};


// ============================================================
// PARSER
// ============================================================

const SECTION_PATTERNS = [
    // Most specific first
    { keywords: ['nice-to-have', 'nice to have', 'bonus points', 'bonus', 'good to have', 'pluses'], importance: 2 },
    { keywords: ['preferred qualifications', 'strongly preferred', 'preferred', 'desired qualifications', 'desired skills'], importance: 3 },
    { keywords: ['minimum qualifications', 'required qualifications', 'basic qualifications', 'must-have', 'must have', 'requirements', 'required skills', 'required'], importance: 5 },
    { keywords: ['qualifications', 'skills required', "what you'll need", 'about you', "what we're looking for"], importance: 4 },
];

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSections(text) {
    const used = [];
    const boundaries = [];

    for (const { keywords, importance } of SECTION_PATTERNS) {
        for (const kw of keywords) {
            const pattern = new RegExp(`(?:^|\\n)\\s*${escapeRegex(kw)}\\s*:?\\s*(?:\\n|$)`, 'gi');
            let m;
            while ((m = pattern.exec(text)) !== null) {
                const start = m.index;
                const end = start + m[0].length;
                const overlap = used.some(([s, e]) => !(end <= s || start >= e));
                if (!overlap) {
                    boundaries.push({ start, end, importance, keyword: kw.trim() });
                    used.push([start, end]);
                }
            }
        }
    }

    boundaries.sort((a, b) => a.start - b.start);

    if (boundaries.length === 0) {
        return [{ text, importance: 4, header: null }];
    }

    const sections = [];
    if (boundaries[0].start > 0) {
        sections.push({ text: text.substring(0, boundaries[0].start), importance: 4, header: null });
    }
    for (let i = 0; i < boundaries.length; i++) {
        const b = boundaries[i];
        const start = b.end;
        const end = i + 1 < boundaries.length ? boundaries[i + 1].start : text.length;
        sections.push({
            text: text.substring(start, end),
            importance: b.importance,
            header: b.keyword,
        });
    }
    return sections;
}

function detectLevel(context) {
    const c = context.toLowerCase();
    if (/\b(expert(ise)?|mastery|guru)\b/.test(c)) return 5;
    if (/\b(advanced|deep (knowledge|understanding|experience)|highly proficient|in[- ]depth)\b/.test(c)) return 4;
    if (/\b(strong|proficient|extensive experience|solid|skilled|significant experience)\b/.test(c)) return 4;
    if (/\b(experience (with|in)|experienced|hands[- ]on|practical experience|working knowledge|comfortable (with|using)|competent)\b/.test(c)) return 3;
    if (/\b(knowledge of|understanding of|familiar with|familiarity with)\b/.test(c)) return 2;
    if (/\b(exposure to|some experience|basic|awareness of|introductory|interest in|learning|aware of)\b/.test(c)) return 1;
    return 3; // default for un-qualified mentions
}

function detectImportance(context) {
    const c = context.toLowerCase();
    if (/\b(must have|must-have|essential|critical|required)\b/.test(c)) return 5;
    if (/\b(strongly preferred|preferred experience|preferred)\b/.test(c)) return 3;
    if (/\b(nice to have|bonus|good to have|pluses)\b/.test(c)) return 2;
    return 4; // default: general qualifications
}

function detectYears(context) {
    let m;
    if ((m = context.match(/(\d+)\s*\+\s*years?/i))) return parseInt(m[1]);
    if ((m = context.match(/(\d+)\s*[-–]\s*(\d+)\s*years?/i))) return parseInt(m[1]);
    if ((m = context.match(/(\d+)\s+to\s+(\d+)\s*years?/i))) return parseInt(m[1]);
    if ((m = context.match(/(\d+)\s*years?\s+(?:of\s+)?experience/i))) return parseInt(m[1]);
    return null;
}

function yearsToLevel(years) {
    if (!years) return 0;
    if (years >= 7) return 5;
    if (years >= 4) return 4;
    if (years >= 2) return 3;
    return 2;
}

function parseCompanyAndRole(text) {
    let companyName = '';
    let jobRole = '';
    const lines = text.split('\n');

    // Get company name (first non-empty, non-logo line)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        if (line && !line.includes('logo') && !line.includes('http') && line.length > 2 && line.length < 50) {
            companyName = line;
            break;
        }
    }

    // Get job title (find first line with job keywords, skip logo/company lines)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line &&
            !line.includes('logo') &&
            !line.includes(companyName) &&
            !line.includes('http') &&
            /\b(Engineer|Developer|Intern|Manager|Analyst|Specialist|Lead|Architect|Designer)\b/i.test(line)) {
            jobRole = line.split(/\s+·|\s+\(|\s+,/)[0]; // Stop at LinkedIn separators
            break;
        }
    }

    return { companyName, jobRole };
}

export function parseJobMeta(text) {
    const meta = {
        locationType: null,
        jobType: null,
        location: null,
        yearsRequired: null,
    };

    const lower = text.toLowerCase();

    // Location type
    if (lower.includes('on-site') || lower.includes('onsite')) meta.locationType = 'On-site';
    else if (lower.includes('hybrid')) meta.locationType = 'Hybrid';
    else if (lower.includes('remote')) meta.locationType = 'Remote';

    // Job type — check Full-time/Part-time/Contract FIRST, internship only if those don't match
    if (lower.includes('full-time') || lower.includes('full time')) meta.jobType = 'Full-time';
    else if (lower.includes('part-time') || lower.includes('part time')) meta.jobType = 'Part-time';
    else if (lower.includes('contract')) meta.jobType = 'Contract';
    else if (lower.includes('internship') || lower.includes('intern')) meta.jobType = 'Internship';

    // Location — try "Location:" prefix first, then fallback to City, State · pattern
    let locationMatch = text.match(/(?:Location|📍)[:\s]*([A-Z][a-zA-Z\s]{1,20},\s*[A-Z]{2})/i);
    if (!locationMatch) {
        // Fallback: City, State · pattern (limit city to 20 chars to avoid "Enterprise Architecture Piscataway")
        locationMatch = text.substring(0, 800).match(/\n([A-Z][a-zA-Z\s]{1,20},\s*[A-Z]{2})\s*·/);
    }
    if (locationMatch) meta.location = locationMatch[1].trim();

    // Years of Experience — just match number + years
    const yearsMatch = text.match(/(\d+)\s*\+?\s*years\b/i);
    if (yearsMatch) meta.yearsRequired = parseInt(yearsMatch[1]);

    return meta;
}

// Duty section header patterns — ordered most-specific first.
const DUTY_HEADER_RE = /(?:^|\n)\s*(?:what\s+you(?:'ll|(?:\s+will))\s+(?:do|be\s+doing)|key\s+responsibilities|primary\s+responsibilities|responsibilities|in\s+this\s+role|your\s+responsibilities|day[- ]to[- ]day|what\s+the\s+role\s+(?:involves|entails)|role\s+overview)\s*:?\s*(?:\n|$)/gi;

// Extract bullet-point job duties from the first matching duties section.
// Returns an array of plain strings, capped at 10. No matching against vocabulary.
function extractJobDuties(text) {
    if (!text || !text.trim()) return [];

    DUTY_HEADER_RE.lastIndex = 0;
    const m = DUTY_HEADER_RE.exec(text);
    if (!m) return [];

    const start = m.index + m[0].length;
    const rest  = text.substring(start, start + 1500);

    // Stop at the next visually distinct section (blank line + title-cased/all-caps word)
    const nextSectionIdx = rest.search(/\n\s*\n\s*(?:[A-Z][A-Z ]{3,}[\n:]|(?:What|Who|About|Our|Your|Requirements|Qualifications|Benefits|Compensation|Perks)\s)/);
    const sectionText    = nextSectionIdx > 0 ? rest.substring(0, nextSectionIdx) : rest;

    const duties = [];
    for (const line of sectionText.split('\n')) {
        const deBulleted = line.trim().replace(/^[•\-\*•‣◦→]+\s*/, '').trim();
        if (deBulleted.length >= 15 && deBulleted.length <= 200) {
            duties.push(deBulleted);
        }
    }

    return duties.slice(0, 10);
}

export function parseJobDescription(text) {
    if (!text || !text.trim()) return [];

    const sections = getSections(text);
    const skills = new Map();

    const entries = registry.getAllSkillEntries();

    for (const section of sections) {
        const used = new Set();
        for (const { canonical, alias, category, guardWords, caseSensitive } of entries) {
            const isRegex = alias.includes('\\b') || alias.includes('(?');
            const flags = caseSensitive ? 'g' : 'gi';
            let pattern;

            // Special handling for C# since # breaks word boundaries
            if (alias.toLowerCase().includes('c#')) {
                pattern = new RegExp(escapeRegex(alias), flags);
            } else {
                pattern = isRegex
                    ? new RegExp(alias, flags)
                    : new RegExp(`\\b${escapeRegex(alias)}\\b`, flags);
            }

            let m;
            while ((m = pattern.exec(section.text)) !== null) {
                let alreadyUsed = false;
                for (let i = m.index; i < m.index + m[0].length; i++) {
                    if (used.has(i)) { alreadyUsed = true; break; }
                }
                if (alreadyUsed) continue;
                if (guardWords?.length) {
                    const wStart = Math.max(0, m.index - 150);
                    const wEnd   = Math.min(section.text.length, m.index + m[0].length + 150);
                    const win = section.text.substring(wStart, wEnd).toLowerCase();
                    if (guardWords.some(gw => win.includes(gw.toLowerCase()))) continue;
                }
                for (let i = m.index; i < m.index + m[0].length; i++) used.add(i);

                const ctxStart = Math.max(0, m.index - 90);
                const ctxEnd = Math.min(section.text.length, m.index + m[0].length + 40);
                const context = section.text.substring(ctxStart, ctxEnd);

                const phraseLvl = detectLevel(context);
                const years = detectYears(context);
                const level = Math.max(phraseLvl, yearsToLevel(years));
                const importance = Math.max(detectImportance(context), section.importance);

                const existing = skills.get(canonical);
                if (!existing) {
                    skills.set(canonical, {
                        name: canonical,
                        category,
                        level,
                        importance: importance,
                        years,
                        context: context.trim(),
                    });
                } else {
                    if (level > existing.level) existing.level = level;
                    if (importance > existing.importance) existing.importance = importance;
                    if (years && (!existing.years || years > existing.years)) existing.years = years;
                }
            }
        }
    }

    const technicalSignals = Array.from(skills.values()).sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
    });

    return {
        technicalSignals,
        behavioralSignals: extractBehavioralSignals(text),
        jobDuties:         extractJobDuties(text),
    };
}


// ============================================================
// RESUME PARSER
// ============================================================

// Re-export under legacy name so existing tests and callers keep working.
export const parseResumeText = parseResume

function parseResumeInput(input, inputType = 'text') {
    switch (inputType) {
        case 'text': return parseResume(input)
        case 'pdf':  return parseResume(input)
        case 'file': return null
        default:     return parseResume(input)
    }
}



// ============================================================
// SAMPLE JD
// ============================================================

const SAMPLE_JD = `Machine Learning Intern — Summer 2026

 About the job

SeatGeek believes live events are powerful experiences that unite humans. With our technological savvy and fan-first attitude we're simplifying and modernizing the ticketing industry.

We're building an awesome entertainment ecosystem where fans have effortless access to incredible live experiences, while sports teams, venues, and shows have unprecedented access to their audiences – because everyone should expect more from the ticketing industry.

Open roles for new graduates

We are looking for the best and brightest Spring/Summer 2026 college graduates to help us make live entertainment even better! Experience is preferred, but not required – in fact, we look forward to supporting you by teaching you new technologies and mentoring you in software development craft as a member of our world-class engineering team.

We Have Roles Open In The Following Technologies

    Backend (Python, Go, C#)
    Frontend Web (Typescript + React)
    Mobile (Kotlin, Swift)
    Platform (AWS, Docker, Python, Go)

What You'll Do

    Solve unique and challenging customer problems
    Work with leading-edge tech in the cloud or on web and mobile
    Help scale our software as we grow our booming business
    Take on the challenges of building software for a many-sided marketplace
    Empower decision-making at a rapidly growing data-driven company
    Run experiments and evaluate new technologies that will determine the future of our business for years to come
    Build performant, beautiful, inclusive user interfaces that delight our users and enhance our brand

What You Have

    You are a college student graduating in the Spring/Summer of 2026, ideally in computer science or a related degree
    Experience in building software. We'll be interested in hearing about what you've built and how you built it
    Problem solving abilities, adept at handling technical challenges. SeatGeek engineers create custom solutions to unique ticketing problems, including venue mapping, inventory tracking, and event matching. We'll be excited to hear about the problems you've solved
    Passion for software craftsmanship and product. You hold yourself and your code to a high standard
    Commitment to your teammates. You enjoy working with a diverse group of people with different experiences and take pride in mentoring and learning from others

Our stack

You do not need experience with all of these, but we thought you might be curious. What we care about is your experience, skills, and approach to problem-solving. Tools can be learned.

    Languages: Python, Go, C#+.NET Core, React+Typescript, Swift, Kotlin
    Datastores: Postgres, Redis, Elasticsearch
    Cloud: AWS
    Version control: Gitlab

Perks

    Equity stake
    Discretionary annual bonus
    Flexible work environment, allowing you to work as many days a week in the office as you'd like or 100% remotely
    A WFH stipend to support your home office setup
    Unlimited PTO
    Eligible for the SG discretionary annual bonus based on individual and company performance
    Up to 16 weeks of fully-paid family leave
    401(k) matching
    Student loan matching program
    Health, vision, dental, and life insurance
    Up to $25k towards family building, reproductive health services and Gender-affirming care
    $500 per year for wellness expenses
    Subscriptions to Headspace (meditation), Headspace Care (therapy), and One Medical
    $120 per month to spend on tickets to live events
    Annual subscription to Spotify, Apple Music, or Amazon music
    Please note you are expected to come into the SeatGeek New York City Office at least 3 days a week**

The salary range for this role is $110,000-$130,000 USD. This role is equity eligible. In addition, you may receive a discretionary annual bonus based on individual and company performance. Actual compensation packages are based on a wide array of factors unique to each candidate, including but not limited to skill set, years and depth of experience, certifications, and specific location.

SeatGeek is committed to providing equal employment opportunities to all employees and applicants for employment regardless of race, color, religion, creed, age, national origin or ancestry, ethnicity, sex, sexual orientation, gender identity or expression, disability, military or veteran status, or any other category protected by federal, state, or local law. As an equal opportunities employer, we recognize that diversity is a positive attribute and we welcome the differences and benefits that a diverse culture brings. Come join us!

To review our candidate privacy notice, click here.
`;

// ============================================================
// UI COMPONENTS
// ============================================================

function ImportanceBadge({ importance }) {
    return (
        <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${IMPORTANCE_STYLES[importance]}`}>
            {IMPORTANCE_NAMES[importance]}
        </span>
    );
}

function ResultsViewSimple({ results, companyName, jobRole }) {
    if (results.length === 0) {
        return (
            <div className="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                No recognized skills detected. The parser uses a curated dictionary —
                very specialized or niche skills may not be matched.
            </div>
        );
    }

    const total = results.length;
    const critical = results.filter(s => s.importance >= 5).length;
    const required = results.filter(s => s.importance >= 4).length;
    const avgLevel = (results.reduce((sum, s) => sum + s.level, 0) / total).toFixed(1);

    const sorted = [...results].sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        return b.level - a.level;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Job Info */}
            {(companyName || jobRole) && (
                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '8px', padding: '12px 16px' }}>
                    {companyName && (
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>{companyName}</div>
                    )}
                    {jobRole && (
                        <div style={{ fontSize: '13px', color: '#0c4a6e', marginTop: '4px' }}>{jobRole}</div>
                    )}
                </div>
            )}


            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Stats Section - Using inline styles */}
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Overview</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Skills</div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{total}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Critical</div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#b91c1c' }}>{critical}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Required</div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{required}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Avg Level</div>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{avgLevel}</div>
                            <div style={{ fontSize: '12px', color: '#78716c', marginTop: '4px' }}>({LEVEL_NAMES[Math.round(avgLevel)]})</div>
                        </div>
                    </div>
                </div>

                {/* Skills Table - Using inline styles */}
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflowX: 'auto' }}>
                    <div style={{ padding: '10px 8px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '140px 145px 145px 115px 100px', gap: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Skill</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Category</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Level</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Importance</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Experience</div>
                    </div>

                    <div>
                        {sorted.map((skill, idx) => (
                            <div key={skill.name} style={{ padding: '8px 6px', borderBottom: idx < sorted.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'grid', gridTemplateColumns: '150px 150px 150px 125px 125px', gap: '2px', alignItems: 'center', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                <div style={{ fontWeight: '500', color: '#0f172a', fontSize: '14px' }}>{skill.name}</div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>{skill.category}</div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>L{skill.level} · {LEVEL_NAMES[skill.level]}</div>
                                <div><ImportanceBadge importance={skill.importance} /></div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>{skill.years ? `${skill.years}+ yrs` : '—'}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BehavioralSignalsPanel({ signals, title = 'Behavioral Signals' }) {
    if (!signals || signals.length === 0) return null;
    return (
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '12px' }}>
            <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {title} ({signals.length})
                </span>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {signals.map(s => (
                    <span key={s.name} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '20px', fontWeight: '500' }}>
                        {s.name}
                    </span>
                ))}
            </div>
        </div>
    );
}

function JobDutiesPanel({ duties }) {
    if (!duties || duties.length === 0) return null;
    return (
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '12px' }}>
            <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    What This Role Does
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>read and decide</span>
            </div>
            <ul style={{ margin: 0, padding: '12px 16px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {duties.map((duty, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#374151', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#94a3b8', flexShrink: 0 }}>•</span>
                        {duty}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function GapAnalysisView({ gap, behavioralGap, jobDuties, companyName, jobRole, jobMeta, decisionResult }) {
    if (!gap) return null;

    const { critical, levelGaps, matched, bonus } = gap;

    // Use the decision engine's matchScore as the single source of truth (fixes B-FIX-01).
    const score = decisionResult?.matchScore ?? 0;
    const scoreColor = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626';
    const scoreLabel = score >= 70 ? 'Strong Match' : score >= 40 ? 'Partial Match' : 'Weak Match';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Zero match warning */}
            {
                critical.length === 0 && levelGaps.length === 0 && matched.length === 0 && bonus.length > 0 && (
                    <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#854d0e' }}>
                        ⚠️ <strong>No tech skills detected in this job description.</strong> This role may be:
                        <ul style={{ marginTop: '6px', marginLeft: '16px', lineHeight: '1.8' }}>
                            <li>A <strong>non-tech role</strong> (construction, healthcare, hospitality, etc.)</li>
                            <li>A <strong>highly specialized role</strong> using domain-specific tools not in our dictionary (e.g. plasma physics, legal software)</li>
                            <li>A <strong>senior/research role</strong> that assumes skills without listing them explicitly</li>
                        </ul>
                        <div style={{ marginTop: '8px', color: '#713f12' }}>
                            This tool is in development and currently aimed at <strong>Software Engineering, ML/AI, and Data Science</strong> roles.
                        </div>
                    </div>
                )
            }

            {(companyName || jobRole) && (
                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '8px', padding: '12px 16px' }}>
                    {companyName && <div style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>{companyName}</div>}
                    {jobRole && <div style={{ fontSize: '13px', color: '#0c4a6e', marginTop: '4px' }}>{jobRole}</div>}
                    {jobMeta && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {jobMeta.location && (
                                <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '20px' }}>
                                    📍 {jobMeta.location}
                                </span>
                            )}
                            {jobMeta.locationType && (
                                <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '20px' }}>
                                    🏢 {jobMeta.locationType}
                                </span>
                            )}
                            {jobMeta.jobType && (
                                <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '20px' }}>
                                    💼 {jobMeta.jobType}
                                </span>
                            )}
                            {jobMeta.yearsRequired && (
                                <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#fce7f3', color: '#be185d', borderRadius: '20px' }}>
                                    📅 {jobMeta.yearsRequired}+ years
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Score Overview */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 items-center">
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Match Score</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: scoreColor }}>{score}%</div>
                        <div style={{ fontSize: '11px', color: scoreColor, fontWeight: '600' }}>{scoreLabel}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Matched</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>{matched.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Missing</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{critical.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Level Gaps</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{levelGaps.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Bonus</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed' }}>{bonus.length}</div>
                    </div>
                </div>
            </div>

            {/* Missing Skills */}
            {critical.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #fecaca', borderRadius: '8px', overflowX: 'auto' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ❌ Missing Skills ({critical.length})
                        </span>
                        <span style={{ fontSize: '11px', color: '#991b1b', marginLeft: '8px' }}>Not found in your resume</span>
                    </div>
                    {critical.map((skill, idx) => (
                        <SkillRow
                            key={skill.name}
                            skill={skill}
                            variant="missing"
                            idx={idx}
                            isLast={idx === critical.length - 1}
                        />
                    ))}
                </div>
            )}

            {/* Level Gaps */}
            {levelGaps.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #fed7aa', borderRadius: '8px', overflowX: 'auto' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⚠️ Level Gaps ({levelGaps.length})
                        </span>
                        <span style={{ fontSize: '11px', color: '#92400e', marginLeft: '8px' }}>You have these but need more depth</span>
                    </div>
                    {levelGaps.map((skill, idx) => (
                        <SkillRow
                            key={skill.name}
                            skill={skill}
                            variant="gap"
                            idx={idx}
                            isLast={idx === levelGaps.length - 1}
                        />
                    ))}
                </div>
            )}

            {/* Matched Skills */}
            {matched.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #bbf7d0', borderRadius: '8px', overflowX: 'auto' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ✅ Matched Skills ({matched.length})
                        </span>
                        <span style={{ fontSize: '11px', color: '#065f46', marginLeft: '8px' }}>You meet or exceed the requirement</span>
                    </div>
                    {matched.map((skill, idx) => (
                        <SkillRow
                            key={skill.name}
                            skill={skill}
                            variant="matched"
                            idx={idx}
                            isLast={idx === matched.length - 1}
                        />
                    ))}
                </div>
            )}

            {/* Bonus Skills */}
            {bonus.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #ddd6fe', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#f5f3ff', borderBottom: '1px solid #ddd6fe' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🎁 Bonus Skills ({bonus.length})
                        </span>
                        <span style={{ fontSize: '11px', color: '#5b21b6', marginLeft: '8px' }}>You have these — JD didn't ask for them</span>
                    </div>
                    <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '140px 140px 140px 140px', gap: '8px' }}>
                        {bonus.map(skill => (
                            <span key={skill.name} style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: '#ede9fe', color: '#5b21b6', borderRadius: '20px', fontWeight: '500' }}>
                                {skill.name} · L{skill.level}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Behavioral Signals */}
            {behavioralGap && (behavioralGap.matched.length > 0 || behavioralGap.missing.length > 0) && (
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Behavioral Signals
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
                            {behavioralGap.matched.length} matched · {behavioralGap.missing.length} not found on resume
                        </span>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {behavioralGap.matched.map(s => (
                            <div key={s.name} style={{ fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ color: '#059669', fontWeight: '700', width: '12px' }}>✓</span>
                                <span style={{ fontWeight: '500', color: '#0f172a' }}>{s.name}</span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>— found on resume</span>
                            </div>
                        ))}
                        {behavioralGap.missing.map(s => (
                            <div key={s.name} style={{ fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontWeight: '700', width: '12px' }}>—</span>
                                <span style={{ fontWeight: '500', color: '#0f172a' }}>{s.name}</span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>— not found on resume</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Job Duties */}
            <JobDutiesPanel duties={jobDuties} />

        </div>
    );
}

function ResumeResultsView({ results }) {
    const SOURCE_COLORS = {
        'Technical Skills': '#0369a1',
        'Education':        '#7c3aed',
        'Projects':         '#059669',
        'Experience':       '#d97706',
        'Certifications':   '#0891b2',
    };

    const skillResults = results.filter(s => s.level !== 'certified');
    const certResults  = results.filter(s => s.level === 'certified');

    const avgLevel = skillResults.length > 0
        ? (skillResults.reduce((s, r) => s + r.level, 0) / skillResults.length).toFixed(1)
        : '—';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Stats */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Your Profile</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Skills</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{skillResults.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Certifications</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0891b2' }}>{certResults.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>L1 Awareness</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#64748b' }}>{skillResults.filter(s => s.level === 1).length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Avg Level</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{avgLevel}</div>
                    </div>
                </div>
            </div>

            {/* Skills Table — L1–L5 skills only */}
            {skillResults.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflowX: 'auto' }}>
                    <div style={{ padding: '10px 8px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '150px 150px 100px 120px', gap: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Skill</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Category</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Level</div>
                        <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Source</div>
                    </div>
                    <div>
                        {skillResults.map((skill, idx) => (
                            <div key={skill.name} style={{ padding: '8px', borderBottom: idx < skillResults.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'grid', gridTemplateColumns: '150px 150px 100px 120px', gap: '8px', alignItems: 'center', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                <div style={{ fontWeight: '500', color: '#0f172a', fontSize: '14px' }}>{skill.name}</div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>{skill.category}</div>
                                <div style={{ fontSize: '12px', color: '#475569' }}>L{skill.level} · {LEVEL_NAMES[skill.level]}</div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: SOURCE_COLORS[skill.source] || '#64748b' }}>{skill.source}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Certifications chips — credential-level evidence, no L1–L5 */}
            {certResults.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#ecfeff', borderBottom: '1px solid #a5f3fc' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#0e7490', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Certifications ({certResults.length})
                        </span>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {certResults.map(cert => (
                            <span key={cert.name} style={{ fontSize: '12px', padding: '4px 12px', backgroundColor: '#cffafe', color: '#0e7490', borderRadius: '20px', fontWeight: '600', border: '1px solid #a5f3fc' }}>
                                {cert.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ResultsView({ results, companyName, jobRole, jobMeta }) {
    if (results.length === 0) {
        return (
            <div className="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                No recognized skills detected...
            </div>
        );
    }

    return <ResultsViewSimple results={results} companyName={companyName} jobRole={jobRole} jobMeta={jobMeta} />;
}

// ============================================================
// GAP ANALYSIS
// ============================================================

export function runGapAnalysis(jdSkills, resumeSkills) {
    if (!jdSkills || !resumeSkills) return null;

    const resumeMap = new Map(resumeSkills.map(s => [s.name, s]));

    const critical = [];    // In JD, not in resume
    const levelGaps = [];   // In resume but below required level
    const matched = [];     // In resume at or above required level
    const bonus = [];       // In resume, not in JD

    // Check each JD skill against resume
    for (const jdSkill of jdSkills) {
        const resumeSkill = resumeMap.get(jdSkill.name);
        if (!resumeSkill) {
            // Missing entirely
            critical.push({
                ...jdSkill,
                resumeLevel: 0,
                gap: jdSkill.level,
            });
        } else if (resumeSkill.level !== 'certified' && (resumeSkill.level < jdSkill.level || resumeSkill.level === 0)) {
            // Have it but below required level
            levelGaps.push({
                ...jdSkill,
                resumeLevel: resumeSkill.level,
                gap: jdSkill.level - resumeSkill.level,
                confidence: resumeSkill.confidence ?? null,
                source: resumeSkill.source ?? null,
            });
        } else {
            // Have it at or above required level (includes 'certified' — credential counts as met)
            matched.push({
                ...jdSkill,
                resumeLevel: resumeSkill.level,
                gap: 0,
                confidence: resumeSkill.confidence ?? null,
                source: resumeSkill.source ?? null,
            });
        }
    }

    // Check resume skills not in JD
    const jdSkillNames = new Set(jdSkills.map(s => s.name));
    for (const resumeSkill of resumeSkills) {
        if (!jdSkillNames.has(resumeSkill.name)) {
            bonus.push(resumeSkill);
        }
    }

    // Sort critical by importance (most important first)
    critical.sort((a, b) => b.importance - a.importance);
    levelGaps.sort((a, b) => b.importance - a.importance);

    return { critical, levelGaps, matched, bonus };
}

export function runBehavioralGap(jdBehavioral, resumeBehavioral) {
    if (!jdBehavioral || !resumeBehavioral) return null;
    const resumeNames = new Set(resumeBehavioral.map(s => s.name));
    const matched = jdBehavioral.filter(s => resumeNames.has(s.name));
    const missing = jdBehavioral.filter(s => !resumeNames.has(s.name));
    return { matched, missing };
}

// ============================================================
// MAIN - APP
// ============================================================

export default function App() {
    const [user, setUser] = useState(null);
    const [isPaidStatus, setIsPaidStatus] = useState(false);
    const [parseCount, setParseCount] = useState(null);
    const [showParseLimit, setShowParseLimit] = useState(false);
    const [showPdfLimit, setShowPdfLimit] = useState(false);
    const [jdInputError, setJdInputError] = useState(false);
    const [resumeInputError, setResumeInputError] = useState(false);
    const [activeTab, setActiveTab] = useState('jd');
    const [input, setInput] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [results, setResults] = useState(null);
    const [resumeInput, setResumeInput] = useState('');
    const [resumeResults, setResumeResults] = useState(null);
    const [jobMeta, setJobMeta] = useState(null);
    const [pdfStatus, setPdfStatus] = useState('idle'); // idle | loading | done | error
    const [pdfInfo, setPdfInfo] = useState(null);       // { name, numPages }
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (paymentsEnabled) {
            const { data: { subscription } } = onAuthStateChange(async (authUser) => {
                setUser(authUser)

                if (authUser) {
                    // Ensure user row exists in public.users
                    await getOrCreateUser({ user: authUser })

                    // Load plan status and saved resume profile in parallel
                    const [planStatus, profile] = await Promise.all([
                        getUserPlanStatus(authUser.id),
                        loadResumeProfile(authUser.id),
                    ])
                    setIsPaidStatus(planStatus)
                    if (profile?.parsed_skills) {
                        setResumeResults({
                            technicalSignals: profile.parsed_skills,
                            behavioralSignals: profile.parsed_soft_skills ?? []
                        })
                    }
                } else {
                    // Signed out — clear user-specific state
                    setResumeResults(null)
                    setIsPaidStatus(false)
                }
            })

            return () => subscription.unsubscribe()
        }
    }, []);

    const parse = async () => {
        if (!input.trim()) {
            setJdInputError(true);
            return;
        }
        setJdInputError(false);
        if (paymentsEnabled) {
            const { allowed, remaining } = await checkAndIncrementParseCount(user, isPaid(user, isPaidStatus));
            if (!allowed) {
                setShowParseLimit(true);
                return;
            }
            setParseCount(remaining);
            setShowParseLimit(false);
        }

        const { companyName: extractedCompany, jobRole: extractedRole } = parseCompanyAndRole(input);
        const meta = parseJobMeta(input);
        setCompanyName(extractedCompany);
        setJobRole(extractedRole);
        setJobMeta(meta);
        const jdResults = parseJobDescription(input);
        setResults(jdResults);
        sessionStorage.setItem('beta_jd_results', JSON.stringify(jdResults));
        sessionStorage.setItem('beta_jd_count', jdResults.technicalSignals.length);
        analytics.parseComplete('jd');
        if (resumeResults?.technicalSignals?.length > 0) {
            setActiveTab('compare');
        }
    }

    const parseResume = async () => {
        if (!resumeInput.trim()) {
            setResumeInputError(true);
            return;
        }
        setResumeInputError(false);
        const parsed = parseResumeInput(resumeInput, 'text');
        setResumeResults(parsed);
        sessionStorage.setItem('beta_resume_results', JSON.stringify(parsed));
        sessionStorage.setItem('beta_resume_count', parsed.technicalSignals.length);
        analytics.parseComplete('resume');
        // Auto-switch to Gap Analysis if JD already parsed
        if (results?.technicalSignals?.length > 0) {
            setActiveTab('compare');
        }
        // Save to Supabase only for paid users — free users don't accumulate stored data
        if (paymentsEnabled) {
            if (user?.id && isPaidStatus) {
                await saveResumeProfile(
                    user.id,
                    parsed.technicalSignals,
                    parsed.behavioralSignals,
                    resumeInput
                )
            }
        }
    };

    const handlePdfUpload = async (file) => {
        if (!file || file.type !== 'application/pdf') return;
        setPdfStatus('loading');
        setPdfInfo(null);
        try {
            const { text, numPages } = await extractTextFromPdf(file);
            setResumeInput(text);
            setPdfStatus('done');
            setPdfInfo({ name: file.name, numPages });
        } catch (err) {
            console.error('PDF extraction failed:', err);
            setPdfStatus('error');
        }
    };

    const exportJson = () => {
        if (!results) return;
        const data = JSON.stringify(results, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'parsed-jd-skills.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">

                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">
                        <Link to="/" className="hover:opacity-80 transition-opacity">Nat20</Link>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 mt-2 text-center">
                        Skill-based job matching, leveled.
                    </p>
                </header>

                {/* Auth bar */}
                <div className="flex justify-end px-4 py-2">
                    {paymentsEnabled && (user ? <UserMenu user={user} /> : <SignInButton />)}
                </div>

                {/* Tabs — single nav, all screen sizes, sticky */}
                <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex">
                        {[
                            { key: 'jd',      label: 'JD',     id: undefined },
                            { key: 'resume',  label: 'Resume', id: 'resume-tab' },
                            { key: 'compare', label: 'Match',  id: 'match-tab' },
                        ].map(({ key, label, id }) => (
                            <button
                                key={key}
                                id={id}
                                onClick={() => setActiveTab(key)}
                                className={`flex-1 sm:flex-none py-3 px-4 sm:px-5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors ${
                                    activeTab === key
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                        {betaFeedbackEnabled && (
                            <button
                                onClick={() => setActiveTab('feedback')}
                                className={`flex-1 sm:flex-none py-3 px-4 sm:px-5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors ${
                                    activeTab === 'feedback'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Feedback
                            </button>
                        )}
                    </div>
                </div>

                {/* JD Parser Tab */}
                {activeTab === 'jd' && (
                    <div className="space-y-4">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Job Description
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setInput(SAMPLE_JD)}
                                    className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                >
                                    Sample
                                </button>
                                <button
                                    onClick={() => { setInput(''); setResults(null); }}
                                    className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                >
                                    Clear
                                </button>
                                {false && results?.technicalSignals?.length > 0 && (
                                    <button
                                        onClick={exportJson}
                                        className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                    >
                                        Export JSON
                                    </button>
                                )}
                            </div>
                        </div>

                        <textarea
                            id="jd-textarea"
                            value={input}
                            onChange={e => { setInput(e.target.value); setJdInputError(false); }}
                            className="w-full h-[200px] sm:h-[280px] p-4 border border-slate-200 rounded-lg font-mono text-[13px] leading-relaxed bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none focus:border-indigo-400 resize-none"
                            placeholder="Paste a job description here..."
                        />

                        <button
                            id="parse-jd-btn"
                            onClick={parse}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition shadow-sm"
                        >
                            Parse Skills →
                        </button>

                        {jdInputError && (
                            <p className="text-xs text-red-500 text-center">
                                Paste a job description before parsing.
                            </p>
                        )}

                        {paymentsEnabled && parseCount !== null && !isPaid(user, isPaidStatus) && (
                            <div className="text-xs text-slate-400 text-right">
                                {parseCount} of {FREE_DAILY_LIMIT} parses remaining today
                            </div>
                        )}

                        {paymentsEnabled && showParseLimit && <UpgradePrompt reason="parse_limit" />}

                        {results !== null && (
                            <>
                                <ResultsView results={results.technicalSignals} companyName={companyName} jobRole={jobRole} jobMeta={jobMeta} />
                                <BehavioralSignalsPanel signals={results.behavioralSignals} title="Behavioral Signals" />
                                <JobDutiesPanel duties={results.jobDuties} />
                            </>
                        )}
                    </div>
                )}

                {/* Resume Parser Tab */}
                {activeTab === 'resume' && (
                    <div className="space-y-4">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Resume
                            </h2>
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={() => {
                                        setResumeInput('');
                                        setResumeResults(null);
                                        setPdfStatus('idle');
                                        setPdfInfo(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                >
                                    Clear
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (file) handlePdfUpload(file);
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const canUploadPDF = !paymentsEnabled || isPaidStatus;
                                        if (!canUploadPDF) {
                                            setShowPdfLimit(true);
                                            return;
                                        }
                                        fileInputRef.current?.click();
                                    }}
                                    disabled={pdfStatus === 'loading'}
                                    className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                    style={{ opacity: pdfStatus === 'loading' ? 0.5 : 1, cursor: pdfStatus === 'loading' ? 'not-allowed' : 'pointer' }}
                                >
                                    Upload PDF {paymentsEnabled && !isPaidStatus ? '🔒' : ''}
                                </button>
                            </div>
                        </div>

                        {/* PDF status — own row, truncated to prevent overflow */}
                        {pdfStatus === 'loading' && (
                            <p className="text-xs text-slate-500">Extracting text from PDF…</p>
                        )}
                        {pdfStatus === 'done' && pdfInfo && (
                            <p className="text-xs text-emerald-600 truncate">{pdfInfo.name} · {pdfInfo.numPages}p</p>
                        )}
                        {pdfStatus === 'error' && (
                            <p className="text-xs text-red-600">Extraction failed — try a different file.</p>
                        )}

                        {paymentsEnabled && showPdfLimit && <UpgradePrompt reason="pdf" />}

                        <textarea
                            value={resumeInput}
                            onChange={e => { setResumeInput(e.target.value); setResumeInputError(false); }}
                            className="w-full h-[200px] sm:h-[280px] p-4 border border-slate-200 rounded-lg font-mono text-[13px] leading-relaxed bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none focus:border-indigo-400 resize-none"
                            placeholder="Paste your resume text here..."
                        />

                        <button
                            onClick={parseResume}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium transition shadow-sm"
                        >
                            Parse Resume →
                        </button>

                        {resumeInputError && (
                            <p className="text-xs text-red-500 text-center">
                                Paste your resume text before parsing.
                            </p>
                        )}

                        {resumeResults !== null && (
                            resumeResults.technicalSignals.length === 0 ? (
                                <div className="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                    No recognized skills detected. Make sure your resume has a TECHNICAL SKILLS or EDUCATION section.
                                </div>
                            ) : (
                                <>
                                    <ResumeResultsView results={resumeResults.technicalSignals} />
                                    <BehavioralSignalsPanel signals={resumeResults.behavioralSignals} title="Behavioral Signals" />
                                </>
                            )
                        )}
                    </div>
                )}

                {/* Gap Analysis Tab */}
                {activeTab === 'compare' && (
                    <div>
                        {(!results?.technicalSignals || !resumeResults?.technicalSignals) ? (
                            <div className="text-sm text-slate-500 p-12 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                <div style={{ marginBottom: '12px' }}>Complete both steps first:</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <div style={{ color: results?.technicalSignals ? '#059669' : '#dc2626' }}>
                                        {results?.technicalSignals ? '✅' : '❌'} Job Description
                                    </div>
                                    <div style={{ color: resumeResults?.technicalSignals ? '#059669' : '#dc2626' }}>
                                        {resumeResults?.technicalSignals ? '✅' : '❌'} Resume
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-slate-400 mb-4">
                                    Scores reflect how your resume communicates each skill — not your actual ability.
                                    If your resume understates a skill, edit it. If it overstates one, expect the gap
                                    to surface in interviews.
                                </p>
                                <GapAnalysisView
                                    gap={runGapAnalysis(results.technicalSignals, resumeResults.technicalSignals)}
                                    behavioralGap={runBehavioralGap(results.behavioralSignals, resumeResults.behavioralSignals)}
                                    jobDuties={results.jobDuties}
                                    companyName={companyName}
                                    jobRole={jobRole}
                                    jobMeta={jobMeta}
                                    decisionResult={getDecision(results, resumeResults)}
                                />
                                <AdSlot isPaid={isPaidStatus} />
                            </>
                        )}
                    </div>
                )}

                {/* Feedback Tab */}
                {betaFeedbackEnabled && activeTab === 'feedback' && (
                    <div className="mt-6">
                        <FeedbackForm />
                    </div>
                )}


            </div>
            <AppFooter />
            <HowToTour onStart={() => setActiveTab('jd')} />
        </div>
    );
}
