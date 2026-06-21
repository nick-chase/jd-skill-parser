import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as registry from '@core/registry.js';
import { extractTextFromPdf } from './lib/pdfExtract.js';
import { parseResume, extractBehavioralSignals } from './core/parser/parseResume.js';
import { parseResumeLite, computeLiteMatch } from './core/parser/parseResumeLite.js';
import { getDecision } from '@core/parser/decision.js';
import SkillRow from './components/SkillRow.jsx'
import LiteResultsView from './components/LiteResultsView.jsx'
import LiteResumeView from './components/LiteResumeView.jsx'
import BoostSection from './components/BoostSection.jsx'
import { getResumeBoostSkills, getMatchBoostSkills } from './utils/boostSkills.js';
import { getOrCreateUser, onAuthStateChange } from './lib/auth.js'
import { analytics } from './lib/analytics.js';
import { saveResumeProfile, loadResumeProfile, getUserPlanStatus } from './lib/supabase.js';
import SignInButton from './components/SignInButton.jsx';
import UserMenu from './components/UserMenu.jsx';
import AppFooter from './components/AppFooter.jsx';
import HowToTour from './components/HowToTour.jsx'
import FeedbackForm from './components/FeedbackForm.jsx';
import { getAffiliateResources } from '@utils/affiliateLoader.js';
import { nameToResourceId } from '@utils/constants.js';
import { runGapAnalysis, runBehavioralGap } from './core/parser/gap.js';
import TierBadge from './components/TierBadge.jsx';

const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
const feedbackEnabled = import.meta.env.VITE_BETA_FEEDBACK_ENABLED === 'true'

// ============================================================
// CLASSIFICATION SYSTEM
// ============================================================
// Proficiency: OPM 5-Level Scale (federal standard)
// Skill names: Lightcast-style canonical names (industry standard)
// Importance: inferred from JD section structure
// ============================================================

const LEVEL_NAMES = ['—', 'Mentioned', 'Limited evidence', 'Supported', 'Strong evidence', 'Extensive evidence'];
const IMPORTANCE_NAMES = ['—', 'Optional', 'Nice-to-have', 'Preferred', 'Required', 'Critical'];

/** Single source of truth for matchScore → label. Used by GapAnalysisView and LiteResultsView. */
export function getMatchScoreLabel(score) {
    if (score >= 70) return 'Strong Match';
    if (score >= 40) return 'Moderate Match';
    return 'Weak Match';
}

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

    // Years of Experience — scan all matches, skip age boilerplate
    const yearsPattern = /(\d+)\s*\+?\s*years?\b/gi;
    let yearsMatch;
    while ((yearsMatch = yearsPattern.exec(text)) !== null) {
        const num = parseInt(yearsMatch[1]);
        if (num > 15) continue;
        const matchIdx  = yearsMatch.index;
        const lineStart = text.lastIndexOf('\n', matchIdx - 1) + 1;
        const lineEndRaw = text.indexOf('\n', matchIdx + yearsMatch[0].length);
        const lineEnd   = lineEndRaw === -1 ? text.length : lineEndRaw;
        const ctxStart  = Math.max(lineStart, matchIdx - 80);
        const ctxEnd    = Math.min(lineEnd,   matchIdx + yearsMatch[0].length + 80);
        const ctx       = text.substring(ctxStart, ctxEnd).toLowerCase();
        if (ctx.includes('of age'))                           continue;
        if (ctx.includes('years old'))                        continue;
        if (ctx.includes('at least') && ctx.includes('age')) continue;
        if (ctx.includes('must be')  && ctx.includes('age')) continue;
        const isExperience =
            ctx.includes('experience') || ctx.includes('working') ||
            ctx.includes('minimum')    || ctx.includes('at least') ||
            yearsMatch[0].includes('+');
        if (!isExperience) continue;
        meta.yearsRequired = num;
        break;
    }

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

const JD_DEGREE_LEVELS = [
    { level: 4, re: /\b(ph\.?d\.?|doctor(?:ate|al)?)\b/i },
    { level: 3, re: /\b(master'?s?|m\.?s\.?(?!\s*shift)|m\.?a\.?\b|m\.?b\.?a\.?|msc)\b/i },
    { level: 2, re: /\b(bachelor'?s?|b\.?s\.?\b|b\.?a\.?\b|undergraduate|4[\s-]?year\s+degree)\b/i },
    { level: 1, re: /\b(associate'?s?|a\.?s\.?\b|a\.?a\.?\b)\b/i },
]

function extractJDDegreeField(line) {
    let m = line.match(/\b(?:degree|bachelor'?s?|master'?s?|ph\.?d\.?|associate'?s?)\s+(?:of|in)\s+([A-Za-z][A-Za-z\s,&\/]+?)(?=\s*(?:,\s*(?:or|and)\s*[a-z]|\s*\(|\s*\.|\s*$))/i)
    if (m) return m[1].trim().replace(/\s+/g, ' ')
    return null
}

export function extractJDDegree(text) {
    if (!text) return { requiredDegreeLevel: null, preferredField: null }

    let requiredDegreeLevel = null
    let preferredField = null
    let foundRequired = false

    for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const lower = trimmed.toLowerCase()
        if (!/\b(?:degree|bachelor|master|phd|ph\.d|associate|graduate|undergraduate)\b/.test(lower)) continue

        let level = null
        for (const { level: lvl, re } of JD_DEGREE_LEVELS) {
            if (re.test(trimmed)) { level = lvl; break }
        }
        if (level === null) continue

        const isRequired = /\b(?:required|must\s+have|essential|minimum)\b/.test(lower)

        if (requiredDegreeLevel === null || (isRequired && !foundRequired)) {
            requiredDegreeLevel = level
            foundRequired = isRequired
            preferredField = extractJDDegreeField(trimmed)
        }
    }

    return { requiredDegreeLevel, preferredField }
}

export function parseJobDescription(text) {
    if (!text || !text.trim()) return { technicalSignals: [], behavioralSignals: [], jobDuties: [], degree: null };

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
        degree:            extractJDDegree(text),
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
// SHARED DESIGN CONSTANTS
// ============================================================

const EVIDENCE_BANDS = [
    { key: 'strong',    label: 'Strong Evidence',  levels: [4, 5], color: 'text-emerald-700' },
    { key: 'supported', label: 'Supported',         levels: [3],    color: 'text-blue-700'   },
    { key: 'limited',   label: 'Limited Evidence',  levels: [2],    color: 'text-amber-700'  },
    { key: 'mentioned', label: 'Mentioned',         levels: [1],    color: 'text-slate-400'  },
];

function getGapSuggestion(name, resumeLevel, requiredLevel) {
    if (!resumeLevel || resumeLevel <= 1) {
        return `Your resume lists ${name} but shows no context. ` +
            `If you have used it professionally or in a project, describe where, ` +
            `how long, and what you accomplished. If you are still learning, ` +
            `a documented hands-on project will build the evidence your resume needs.`;
    }
    if (resumeLevel === 2) {
        return `You have some ${name} experience showing on your resume. ` +
            `Add a duration, a specific outcome, and a scale detail to push this higher.`;
    }
    if (resumeLevel >= 3) {
        return `Your ${name} evidence is solid. ` +
            `Add an ownership or leadership signal — led, architected, owned — ` +
            `with a measurable outcome to close this gap.`;
    }
    return `Add duration and a specific outcome to your ${name} experience to close the one-level gap.`;
}

function formatDuration(months) {
    if (months == null) return null;
    const yrs = Math.floor(months / 12);
    const mos = months % 12;
    if (yrs >= 1 && mos === 0) return `${yrs} yr${yrs !== 1 ? 's' : ''}`;
    if (yrs >= 1) return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mos} mo`;
    return `${months} mo`;
}

function evidenceSummary(skill) {
    const isListedOnly = skill.source === 'Technical Skills' || skill.source === 'Summary';
    if (isListedOnly) return 'listed only';
    const parts = [];
    const dur = formatDuration(skill.durationMonths);
    parts.push(dur ?? 'no duration stated');
    const count = skill.contextCount ?? 1;
    if (count >= 3) parts.push('3+ contexts');
    else if (count >= 2) parts.push('2 contexts');
    return parts.join(' · ');
}

function ConfidenceDot({ confidence }) {
    const color = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : '#94a3b8';
    return <span style={{ color, fontSize: '10px', marginLeft: '2px', lineHeight: 1 }}>●</span>;
}

// ============================================================
// SHARED UI PRIMITIVES
// ============================================================

function SectionHeader({ label, count, color = 'text-slate-500' }) {
    return (
        <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${color}`}>
            {label}{count !== undefined ? ` — ${count}` : ''}
        </div>
    );
}

function SkillLine({ name, meta, color = 'text-slate-700', bg = 'bg-slate-50', metaColor, evidenceText, level, confidence }) {
    const hasEvidence = evidenceText != null || level != null;
    return (
        <div className={`flex items-center gap-2 py-1 px-2.5 rounded-lg ${bg} text-sm mb-1`}>
            <span className={`font-medium ${color} shrink-0`}>{name}</span>
            {hasEvidence && (
                <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">{evidenceText}</span>
            )}
            <div className="flex items-center gap-2 ml-auto shrink-0">
                {level != null && (
                    <span className="text-xs text-slate-500 flex items-center">
                        L{level}<ConfidenceDot confidence={confidence} />
                    </span>
                )}
                {meta && (
                    <span className="text-xs text-slate-400"
                          style={metaColor ? { color: metaColor } : undefined}>
                        {meta}
                    </span>
                )}
            </div>
        </div>
    );
}

function SignalPills({ signals, emptyText = 'None detected' }) {
    return (
        <div className="flex flex-wrap gap-1">
            {signals?.length > 0
                ? signals.map(s => (
                    <span key={s.name ?? s}
                          className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {s.name ?? s}
                    </span>
                  ))
                : <span className="text-xs text-slate-400">{emptyText}</span>
            }
        </div>
    );
}

function CollapsibleSection({ label, count, color = 'text-slate-400', children }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="mb-4">
            <button
                onClick={() => setOpen(!open)}
                className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 w-full text-left mb-2 ${color}`}
            >
                {label}{count !== undefined ? ` — ${count} skill${count !== 1 ? 's' : ''}` : ''}
                <span className="ml-auto">{open ? '▲' : '▼'}</span>
            </button>
            {open && children}
        </div>
    );
}

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

function ResultsViewSimple({ results, companyName, jobRole, behavioralSignals, jobDuties }) {
    if (results.length === 0) {
        return (
            <div className="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                No recognized skills detected. The parser uses a curated dictionary —
                very specialized or niche skills may not be matched.
            </div>
        );
    }

    const requiredSkills  = results.filter(s => s.importance >= 4)
                                   .sort((a, b) => b.importance - a.importance || b.level - a.level);
    const preferredSkills = results.filter(s => s.importance === 3);
    const niceToHave      = results.filter(s => s.importance <= 2);

    return (
        <div className="flex flex-col gap-4">

            {(companyName || jobRole) && (
                <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '8px', padding: '12px 16px' }}>
                    {companyName && <div style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>{companyName}</div>}
                    {jobRole && <div style={{ fontSize: '13px', color: '#0c4a6e', marginTop: '4px' }}>{jobRole}</div>}
                </div>
            )}

            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Role Requirements</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Skills Found</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{results.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Required</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{requiredSkills.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Preferred</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0369a1' }}>{preferredSkills.length + niceToHave.length}</div>
                    </div>
                </div>
            </div>

            {/* What this role does — read first */}
            {jobDuties?.length > 0 && (
                <>
                    <div className="pl-3 border-l-2 border-slate-100 mb-4">
                        <JobDutiesPanel duties={jobDuties} />
                    </div>
                    <div className="border-t border-slate-100 my-4" />
                </>
            )}

            {/* Behavioral expectations */}
            {behavioralSignals?.length > 0 && (
                <>
                    <div className="pl-3 border-l-2 border-indigo-200 mb-4">
                        <BehavioralSignalsPanel signals={behavioralSignals} title="Behavioral Expectations" />
                    </div>
                    <div className="border-t border-slate-100 my-4" />
                </>
            )}

            {requiredSkills.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-200 mb-4">
                    <SectionHeader label="Required Skills" count={requiredSkills.length} color="text-slate-700" />
                    {requiredSkills.map(skill => (
                        <SkillLine
                            key={skill.name}
                            name={skill.name}
                            meta={skill.importance === 5 ? `Critical · ${skill.category}` : skill.category}
                        />
                    ))}
                </div>
            )}

            {preferredSkills.length > 0 && (
                <CollapsibleSection label="Preferred" count={preferredSkills.length} color="text-blue-600">
                    {preferredSkills.map(skill => (
                        <SkillLine key={skill.name} name={skill.name} meta={skill.category} color="text-slate-500" />
                    ))}
                </CollapsibleSection>
            )}

            {niceToHave.length > 0 && (
                <CollapsibleSection label="Nice to Have" count={niceToHave.length} color="text-slate-400">
                    {niceToHave.map(skill => (
                        <SkillLine key={skill.name} name={skill.name} meta={skill.category} color="text-slate-400" />
                    ))}
                </CollapsibleSection>
            )}
        </div>
    );
}

function BehavioralSignalsPanel({ signals, title = 'Behavioral Signals' }) {
    if (!signals || signals.length === 0) return null;
    return (
        <div className="mb-4">
            <SectionHeader label={title} count={signals.length} color="text-slate-500" />
            <SignalPills signals={signals} />
        </div>
    );
}

function JobDutiesPanel({ duties }) {
    if (!duties || duties.length === 0) return null;
    return (
        <div className="mb-4">
            <SectionHeader label="What This Role Does" color="text-slate-500" />
            <p className="text-xs text-slate-400 mb-2">Read and decide.</p>
            <ul className="space-y-2">
                {duties.map((duty, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm text-slate-600 leading-relaxed">
                        <span className="text-slate-300 flex-shrink-0">•</span>
                        {duty}
                    </li>
                ))}
            </ul>
        </div>
    );
}

const DEGREE_LEVEL_LABELS = { 1: "Associate's", 2: "Bachelor's", 3: "Master's", 4: 'PhD' }

export function computeDegreeFlag(resumeDegree, jdDegree) {
    if (!jdDegree?.requiredDegreeLevel) return { status: 'not_stated' }

    const required = jdDegree.requiredDegreeLevel
    const found    = resumeDegree?.degreeLevel ?? null

    if (found === null) {
        return {
            status: 'gap',
            required: DEGREE_LEVEL_LABELS[required] ?? 'Degree',
            found:    null,
            note:     'Not detected on resume — consider highlighting relevant experience',
        }
    }

    if (found >= required) {
        const foundLabel  = DEGREE_LEVEL_LABELS[found] ?? `Level ${found}`
        const fieldSuffix = resumeDegree.field ? ` in ${resumeDegree.field}` : ''
        return {
            status: 'match',
            required: DEGREE_LEVEL_LABELS[required] ?? 'Degree',
            found:    foundLabel + fieldSuffix,
            note:     null,
        }
    }

    return {
        status: 'gap',
        required: DEGREE_LEVEL_LABELS[required] ?? 'Degree',
        found:    DEGREE_LEVEL_LABELS[found] ?? `Level ${found}`,
        note:     'Resume shows a lower degree — consider highlighting relevant experience',
    }
}

function DegreeFlagCard({ degreeFlag }) {
    if (!degreeFlag || degreeFlag.status === 'not_stated') return null
    const isMatch = degreeFlag.status === 'match'
    return (
        <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: `1px solid ${isMatch ? '#bbf7d0' : '#fde68a'}`,
            backgroundColor: isMatch ? '#f0fdf4' : '#fffbeb',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '4px',
        }}>
            <span style={{ fontSize: '15px', flexShrink: 0, lineHeight: '1.6' }}>{isMatch ? '✓' : '!'}</span>
            <div>
                <div style={{ fontWeight: '600', color: isMatch ? '#166534' : '#92400e' }}>
                    Degree required: {degreeFlag.required}
                    {isMatch
                        ? <span style={{ marginLeft: '8px', color: '#059669', fontWeight: '400' }}>— {degreeFlag.found} · Matches</span>
                        : degreeFlag.found
                            ? <span style={{ marginLeft: '8px', color: '#d97706', fontWeight: '400' }}>— {degreeFlag.found} found · Gap</span>
                            : <span style={{ marginLeft: '8px', color: '#d97706', fontWeight: '400' }}>— Not detected · Gap</span>
                    }
                </div>
                {degreeFlag.note && (
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>→ {degreeFlag.note}</div>
                )}
            </div>
        </div>
    )
}

function GapAnalysisView({ gap, behavioralGap, jobDuties, companyName, jobRole, jobMeta, decisionResult, degreeFlag, isPaid: isPaidProp }) {
    if (!gap) return null;

    const { critical, levelGaps, matched, bonus } = gap;

    // Sort gaps: required/critical first, then by gap size descending
    const sortedGaps = [...levelGaps].sort((a, b) => {
        const aReq = a.importance >= 4 ? 1 : 0;
        const bReq = b.importance >= 4 ? 1 : 0;
        if (bReq !== aReq) return bReq - aReq;
        return (b.level - (b.resumeLevel ?? 0)) - (a.level - (a.resumeLevel ?? 0));
    });
    const topGaps       = sortedGaps.slice(0, 3);
    const remainingGaps = sortedGaps.slice(3);

    // Use the decision engine's matchScore as the single source of truth (fixes B-FIX-01).
    const score = decisionResult?.matchScore ?? 0;
    const scoreColor = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626';
    const scoreLabel = getMatchScoreLabel(score);

    return (
        <div className="flex flex-col gap-4">

            {/* Degree requirement flag */}
            <DegreeFlagCard degreeFlag={degreeFlag} />

            {/* Zero match warning */}
            {critical.length === 0 && levelGaps.length === 0 && matched.length === 0 && bonus.length > 0 && (
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
            )}

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

            {/* Score overview */}
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

            {/* Job duties — read what the role does first */}
            {jobDuties?.length > 0 && (
                <>
                    <div className="pl-3 border-l-2 border-slate-100 mb-4">
                        <JobDutiesPanel duties={jobDuties} />
                    </div>
                    <div className="border-t border-slate-100 my-4" />
                </>
            )}

            {/* Behavioral signals — present vs missing */}
            {behavioralGap && (behavioralGap.matched.length > 0 || behavioralGap.missing.length > 0) && (
                <>
                    <div className="pl-3 border-l-2 border-indigo-200 mb-3">
                        <SectionHeader label="Behavioral Signals" color="text-slate-500" />
                        <div className="mb-2">
                            <div className="text-xs text-slate-400 mb-1">Present in your resume:</div>
                            <SignalPills signals={behavioralGap.matched} emptyText="None matched" />
                        </div>
                        {behavioralGap.missing.length > 0 && (
                            <div>
                                <div className="text-xs text-slate-400 mb-1">Not found on resume:</div>
                                <SignalPills signals={behavioralGap.missing} />
                            </div>
                        )}
                    </div>
                    <div className="border-t border-slate-100 my-4" />
                </>
            )}

            {/* Matched skills */}
            {matched.length > 0 && (
                <div className="mb-2">
                    <SectionHeader label="Matched" count={matched.length} color="text-emerald-700" />
                    {matched.map(skill => {
                        const resumeLabel = skill.resumeLevel === 'certified'
                            ? 'Certified'
                            : (LEVEL_NAMES[skill.resumeLevel] ?? `L${skill.resumeLevel}`);
                        const jdLabel = LEVEL_NAMES[skill.level] ?? `L${skill.level}`;
                        return (
                            <div key={skill.name}
                                 className="flex items-start justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-emerald-50 mb-1">
                                <div className="min-w-0">
                                    <div className="font-medium text-emerald-800 text-sm">{skill.name}</div>
                                    <div className="text-xs text-gray-400">{evidenceSummary(skill)}</div>
                                </div>
                                <span className="text-xs text-emerald-600 shrink-0 flex items-center mt-0.5">
                                    You: {resumeLabel}<ConfidenceDot confidence={skill.confidence} /> · JD: {jdLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Missing skills */}
            {critical.length > 0 && (
                <div className="mb-2">
                    <SectionHeader label="Missing from Resume" count={critical.length} color="text-slate-600" />
                    <div style={{ overflowX: 'auto' }}>
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
                </div>
            )}

            {/* Evidence Gaps — Focus Zone */}
            {levelGaps.length > 0 && (
                <div className="mb-2">

                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                        Top gaps to address — {topGaps.length} of {levelGaps.length}
                    </div>

                    {/* Focus Zone — top 3 */}
                    <div className="border border-amber-200 rounded-xl bg-amber-50/40 p-4 space-y-4 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                Focus here first
                            </span>
                            <div className="flex-1 h-px bg-amber-200" />
                        </div>

                        {topGaps.map((skill, index) => {
                            const affiliateResource = getAffiliateResources(nameToResourceId(skill.name), skill.resumeLevel ?? 1, 'tech', skill.name)[0] ?? null;
                            const resumeLabel = skill.resumeLevel
                                ? (LEVEL_NAMES[skill.resumeLevel] ?? `L${skill.resumeLevel}`)
                                : 'Not evidenced';
                            const jdLabel = LEVEL_NAMES[skill.level] ?? `L${skill.level}`;
                            const suggestion = getGapSuggestion(skill.name, skill.resumeLevel ?? 0, skill.level);

                            return (
                                <div key={skill.name}
                                     className={`pb-4 ${index < topGaps.length - 1 ? 'border-b border-amber-100' : ''}`}>

                                    {/* Skill header */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                            <div className="font-semibold text-slate-800 text-sm">{skill.name}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">{evidenceSummary(skill)}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs text-amber-600 font-medium flex items-center">
                                                {resumeLabel}<ConfidenceDot confidence={skill.confidence} /> → {jdLabel}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                                                {IMPORTANCE_NAMES[skill.importance] ?? 'Required'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Suggestion sentence */}
                                    <div className="text-xs text-slate-500 italic mb-2">{suggestion}</div>

                                    {/* Evidence checklist */}
                                    <div className="text-xs font-medium text-slate-600 mb-1">
                                        To strengthen your {skill.name} evidence, add:
                                    </div>
                                    <div className="space-y-0.5 pl-1 mb-3">
                                        {[
                                            'Where you used it (job title or project name)',
                                            'How long (months or years)',
                                            'What you built or accomplished',
                                            'One specific outcome or scale detail',
                                        ].map(item => (
                                            <div key={item} className="flex items-start gap-1.5 text-xs text-slate-500">
                                                <span className="text-amber-300 mt-0.5 flex-shrink-0">☐</span>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Resources */}
                                    {affiliateResource && (
                                        <div className="space-y-1">
                                            <a href={affiliateResource.url}
                                               target="_blank" rel="noopener noreferrer"
                                               className="flex items-center gap-2 text-xs mt-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition">
                                                <span>📚</span>
                                                <span className="font-medium">{affiliateResource.title}</span>
                                                <span className="text-[10px] text-indigo-400 ml-auto">
                                                    {affiliateResource.platform} · affiliate
                                                </span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Remaining gaps — compact list */}
                    {remainingGaps.length > 0 && (
                        <>
                            <div className="border-t border-slate-100 my-4" />
                            <div className="pl-3 border-l-2 border-slate-100 mb-4">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                    Other gaps — {remainingGaps.length}
                                </div>
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                    {remainingGaps.map((skill, index) => (
                                        <div key={skill.name}
                                             className={`flex items-center gap-3 px-3 py-2.5 text-sm
                                                         ${index < remainingGaps.length - 1 ? 'border-b border-slate-100' : ''}
                                                         hover:bg-slate-50 transition`}>
                                            <span className="font-medium text-slate-600 shrink-0">{skill.name}</span>
                                            <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">{evidenceSummary(skill)}</span>
                                            <span className="text-xs text-slate-400 shrink-0 flex items-center">
                                                {skill.resumeLevel
                                                    ? (LEVEL_NAMES[skill.resumeLevel] ?? `L${skill.resumeLevel}`)
                                                    : '—'}<ConfidenceDot confidence={skill.confidence} /> → {LEVEL_NAMES[skill.level] ?? `L${skill.level}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Bonus skills — collapsed */}
            {bonus.length > 0 && (
                <CollapsibleSection label="Bonus Skills" count={bonus.length} color="text-violet-600">
                    <div className="flex flex-wrap gap-1">
                        {bonus.map(skill => (
                            <span key={skill.name}
                                  className="text-xs px-2.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full font-medium">
                                {skill.name} · L{skill.level}
                            </span>
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {/* Zone 2 — Boost skills for this specific role (Priority 2/3 gated for free users) */}
            <BoostSection
                skills={getMatchBoostSkills({ critical, levelGaps })}
                zone="match"
                jobTitle={jobRole ?? null}
                isPaidUser={isPaidProp}
            />

        </div>
    );
}

function ResumeResultsView({ results, behavioralSignals, degree, isPaid: isPaidProp }) {
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
        <div className="flex flex-col gap-3">

            {/* Profile summary bar */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '10px' }}>Your Profile</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Skills</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{skillResults.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Certifications</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0891b2' }}>{certResults.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Mentioned</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#64748b' }}>{skillResults.filter(s => s.level === 1).length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Avg Level</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a' }}>{avgLevel}</div>
                    </div>
                </div>
            </div>

            {/* Behavioral signals */}
            <div className="mb-3">
                <SectionHeader label="Behavioral Signals" count={behavioralSignals?.length ?? 0} color="text-slate-500" />
                <SignalPills signals={behavioralSignals ?? []} />
            </div>

            {/* Certifications */}
            <div className="mb-3">
                <SectionHeader label="Certifications" color="text-slate-500" />
                <div className="flex flex-wrap gap-1">
                    {certResults.length > 0
                        ? certResults.map(cert => (
                            <span key={cert.name}
                                  className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600
                                             border border-indigo-200 rounded-full">
                                {cert.name}
                            </span>
                          ))
                        : <span className="text-xs text-slate-400">None detected</span>
                    }
                </div>
            </div>

            {/* Education / Degrees */}
            <div className="pl-3 border-l-2 border-slate-200 mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
                    Education &amp; Degrees
                </div>
                {degree?.degreeLevel ? (
                    <div className="text-xs text-slate-600">
                        <span className="font-medium">{DEGREE_LEVEL_LABELS[degree.degreeLevel]}</span>
                        {degree.field && <span className="text-slate-500"> in {degree.field}</span>}
                        {degree.institution && <span className="text-slate-400"> · {degree.institution}</span>}
                        {degree.graduationYear && <span className="text-slate-400"> ({degree.graduationYear})</span>}
                    </div>
                ) : (
                    <span className="text-xs text-slate-400">No degree detected in Education section</span>
                )}
            </div>

            {/* Skills grouped by evidence band */}
            {EVIDENCE_BANDS.map(band => {
                const bandSkills = skillResults.filter(s => band.levels.includes(s.level));
                if (bandSkills.length === 0) return null;

                if (band.key === 'mentioned') {
                    return (
                        <CollapsibleSection key={band.key} label={band.label} count={bandSkills.length} color={band.color}>
                            {bandSkills.map(skill => (
                                <SkillLine key={skill.name} name={skill.name}
                                           meta={skill.source} color="text-slate-400"
                                           evidenceText={evidenceSummary(skill)}
                                           level={skill.level} confidence={skill.confidence} />
                            ))}
                        </CollapsibleSection>
                    );
                }

                return (
                    <div key={band.key} className="mb-3">
                        <SectionHeader label={band.label} count={bandSkills.length} color={band.color} />
                        {bandSkills.map(skill => (
                            <SkillLine key={skill.name} name={skill.name}
                                       meta={skill.source}
                                       metaColor={SOURCE_COLORS[skill.source]}
                                       evidenceText={evidenceSummary(skill)}
                                       level={skill.level} confidence={skill.confidence} />
                        ))}
                    </div>
                );
            })}

            {/* Zone 1 — Boost weak-evidence resume skills (gated for free users) */}
            <BoostSection
                skills={getResumeBoostSkills(results)}
                zone="resume"
                isPaidUser={isPaidProp}
            />

        </div>
    );
}

function ResultsView({ results, companyName, jobRole, jobMeta, behavioralSignals, jobDuties }) {
    if (results.length === 0) {
        return (
            <div className="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                No recognized skills detected...
            </div>
        );
    }

    return (
        <ResultsViewSimple
            results={results}
            companyName={companyName}
            jobRole={jobRole}
            jobMeta={jobMeta}
            behavioralSignals={behavioralSignals}
            jobDuties={jobDuties}
        />
    );
}

// ============================================================
// MAIN - APP
// ============================================================

export default function App() {
    const [user, setUser] = useState(null);
    const [isPaidStatus, setIsPaidStatus] = useState(false);
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
        try {
            ['nat20_resume_fp', 'nat20_parse_date', 'nat20_parse_count'].forEach(k => localStorage.removeItem(k));
        } catch (_) {}
    }, []);

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

        const { companyName: extractedCompany, jobRole: extractedRole } = parseCompanyAndRole(input);
        const meta = parseJobMeta(input);
        setCompanyName(extractedCompany);
        setJobRole(extractedRole);
        setJobMeta(meta);
        const jdResults = parseJobDescription(input);
        setResults(jdResults);
        // sessionStorage keys retain "beta_" prefix for historical continuity; renaming would invalidate active user sessions
        sessionStorage.setItem('beta_jd_results', JSON.stringify(jdResults));
        sessionStorage.setItem('beta_jd_count', jdResults.technicalSignals.length);
        analytics.parseComplete('jd');
        if (resumeResults != null) {
            setActiveTab('compare');
        }
    }

    const parseResume = async () => {
        if (!resumeInput.trim()) {
            setResumeInputError(true);
            return;
        }
        setResumeInputError(false);
        const parsed = isPaidStatus ? parseResumeInput(resumeInput, 'text') : parseResumeLite(resumeInput);
        setResumeResults(parsed);
        sessionStorage.setItem('beta_resume_results', JSON.stringify(parsed));
        sessionStorage.setItem('beta_resume_count', parsed.technicalSignals?.length ?? parsed.topSkills?.totalDetected ?? 0);
        analytics.parseComplete('resume');
        // Auto-switch to Gap Analysis if JD already parsed
        if (results != null) {
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
        // PDF upload is a Pro feature — gate on subscription status, not on whether
        // payments are enabled. A Lite user is always Lite regardless of build flags.
        if (!isPaidStatus) {
            setPdfStatus('pro-only');
            return;
        }
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
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center flex items-center justify-center gap-2">
                        <Link to="/" className="hover:opacity-80 transition-opacity">Nat20</Link>
                        <TierBadge isPaidStatus={isPaidStatus} />
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
                        {feedbackEnabled && (
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

                        {results !== null && (
                            <ResultsView
                                results={results.technicalSignals}
                                companyName={companyName}
                                jobRole={jobRole}
                                jobMeta={jobMeta}
                                behavioralSignals={results.behavioralSignals}
                                jobDuties={results.jobDuties}
                            />
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
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={pdfStatus === 'loading'}
                                    className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                    style={{ opacity: pdfStatus === 'loading' ? 0.5 : 1, cursor: pdfStatus === 'loading' ? 'not-allowed' : 'pointer' }}
                                >
                                    Upload PDF
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
                        {pdfStatus === 'pro-only' && (
                            <p className="text-xs text-indigo-700">
                                PDF upload reads your resume exactly as it's formatted — no copy-paste gaps.{' '}
                                <a href="/pricing" className="font-semibold underline hover:text-indigo-900">
                                    Get the full report — closer to your next offer.
                                </a>
                            </p>
                        )}

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
                            isPaidStatus ? (
                                resumeResults.technicalSignals.length === 0 ? (
                                    <div className="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                        No recognized skills detected. Make sure your resume has a TECHNICAL SKILLS or EDUCATION section.
                                    </div>
                                ) : (
                                    <>
                                        <ResumeResultsView
                                            results={resumeResults.technicalSignals}
                                            behavioralSignals={resumeResults.behavioralSignals}
                                            degree={resumeResults.degree}
                                            isPaid={isPaidStatus}
                                        />
                                    </>
                                )
                            ) : (
                                <LiteResumeView liteResults={resumeResults} />
                            )
                        )}
                    </div>
                )}

                {/* Gap Analysis Tab */}
                {activeTab === 'compare' && (
                    <div>
                        {(!results?.technicalSignals || !resumeResults) ? (
                            <div className="text-sm text-slate-500 p-12 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                <div style={{ marginBottom: '12px' }}>Complete both steps first:</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <div style={{ color: results?.technicalSignals ? '#059669' : '#dc2626' }}>
                                        {results?.technicalSignals ? '✅' : '❌'} Job Description
                                    </div>
                                    <div style={{ color: resumeResults ? '#059669' : '#dc2626' }}>
                                        {resumeResults ? '✅' : '❌'} Resume
                                    </div>
                                </div>
                            </div>
                        ) : isPaidStatus ? (
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
                                    degreeFlag={computeDegreeFlag(resumeResults.degree, results.degree)}
                                    isPaid={isPaidStatus}
                                />
                            </>
                        ) : (
                            <LiteResultsView
                                resumeData={resumeResults}
                                liteMatch={computeLiteMatch(resumeResults, results)}
                                duties={results?.jobDuties ?? []}
                            />
                        )}
                    </div>
                )}

                {/* Feedback Tab */}
                {feedbackEnabled && activeTab === 'feedback' && (
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
