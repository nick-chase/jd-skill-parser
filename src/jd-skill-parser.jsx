import { useState } from 'react';
import * as registry from './lib/registry.js';

// ============================================================
// CLASSIFICATION SYSTEM
// ============================================================
// Proficiency: OPM 5-Level Scale (federal standard)
// Skill names: Lightcast-style canonical names (industry standard)
// Importance: inferred from JD section structure
// ============================================================

const LEVEL_NAMES = ['—', 'Awareness', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
const IMPORTANCE_NAMES = ['—', 'Optional', 'Nice-to-have', 'Preferred', 'Required', 'Critical'];

const IMPORTANCE_STYLES = {
    5: 'bg-rose-50 text-rose-700 border-rose-200',
    4: 'bg-amber-50 text-amber-800 border-amber-200',
    3: 'bg-sky-50 text-sky-700 border-sky-200',
    2: 'bg-slate-100 text-slate-600 border-slate-200',
    1: 'bg-slate-50 text-slate-500 border-slate-200',
};

function compareSkillsToRole(results, roleTemplate) {
    if (!roleTemplate) return null;

    const detectedSkills = new Set(results.map(s => s.name));

    const missing = {
        critical: roleTemplate.critical.filter(s => !detectedSkills.has(s)),
        required: roleTemplate.required.filter(s => !detectedSkills.has(s)),
        preferred: roleTemplate.preferred.filter(s => !detectedSkills.has(s))
    };

    const matched = {
        critical: roleTemplate.critical.filter(s => detectedSkills.has(s)),
        required: roleTemplate.required.filter(s => detectedSkills.has(s)),
        preferred: roleTemplate.preferred.filter(s => detectedSkills.has(s))
    };

    const coverage = {
        critical: matched.critical.length / roleTemplate.critical.length,
        required: matched.required.length / roleTemplate.required.length,
        preferred: matched.preferred.length / roleTemplate.preferred.length
    };

    return { missing, matched, coverage };
}

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

    // Match against role templates
    const matched = registry.matchRole(jobRole);
    if (matched) {
        jobRole = matched.role; // Replace with canonical role name
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

export function parseJobDescription(text) {
    if (!text || !text.trim()) return [];

    const sections = getSections(text);
    const skills = new Map();

    const entries = registry.getAllSkillEntries();

    for (const section of sections) {
        const used = new Set();
        for (const { canonical, alias, category, guardWords } of entries) {
            const isRegex = alias.includes('\\b') || alias.includes('(?');
            let pattern;

            // Special handling for C# since # breaks word boundaries
            if (alias.toLowerCase().includes('c#')) {
                pattern = new RegExp(escapeRegex(alias), 'gi');
            } else {
                pattern = isRegex
                    ? new RegExp(alias, 'gi')
                    : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi');
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

    return Array.from(skills.values()).sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
    });
}


// ============================================================
// RESUME PARSER
// ============================================================

// Generic input handler - extensible for PDF/file later
function parseResumeInput(input, inputType = 'text') {
    switch (inputType) {
        case 'text': return parseResumeText(input);
        case 'pdf': return null; // stub for later
        case 'file': return null; // stub for later
        default: return parseResumeText(input);
    }
}

// Extract a named section from resume text
function extractSection(text, sectionName) {
    const sectionHeaders = [
        'PROFESSIONAL SUMMARY',
        'EDUCATION',
        'TECHNICAL SKILLS',
        'PROJECTS',
        'PROFESSIONAL EXPERIENCE',
        'ADDITIONAL INFORMATION',
        'CERTIFICATIONS',
        'SKILLS',
        'EXPERIENCE',
        'WORK EXPERIENCE',
    ];

    const upperText = text.toUpperCase();
    const startIdx = upperText.indexOf(sectionName.toUpperCase());
    if (startIdx === -1) return '';

    // Find where next section starts
    let endIdx = text.length;
    for (const header of sectionHeaders) {
        if (header === sectionName.toUpperCase()) continue;
        const idx = upperText.indexOf(header, startIdx + sectionName.length);
        if (idx !== -1 && idx < endIdx) endIdx = idx;
    }

    return text.substring(startIdx + sectionName.length, endIdx).trim();
}

// Split resume into named sections
function extractResumeSections(text) {
    return {
        summary: extractSection(text, 'PROFESSIONAL SUMMARY'),
        education: extractSection(text, 'EDUCATION'),
        technicalSkills: extractSection(text, 'TECHNICAL SKILLS'),
        projects: extractSection(text, 'PROJECTS'),
        experience: extractSection(text, 'PROFESSIONAL EXPERIENCE'),
        additionalInfo: extractSection(text, 'ADDITIONAL INFORMATION'),
    };
}

// Extract skills from TECHNICAL SKILLS section
// Cap: L2 max, L1 if marked "learning"
function extractSkillsFromTechnicalSection(text) {
    const skills = [];
    if (!text) return skills;

    const entries = registry.getAllSkillEntries();

    const used = new Set();
    for (const { canonical, alias, category, guardWords } of entries) {
        const isRegex = alias.includes('\\b') || alias.includes('(?');
        let pattern;
        if (alias.toLowerCase().includes('c#')) {
            pattern = new RegExp(escapeRegex(alias), 'gi');
        } else {
            pattern = isRegex
                ? new RegExp(alias, 'gi')
                : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi');
        }

        let m;
        while ((m = pattern.exec(text)) !== null) {
            let alreadyUsed = false;
            for (let i = m.index; i < m.index + m[0].length; i++) {
                if (used.has(i)) { alreadyUsed = true; break; }
            }
            if (alreadyUsed) continue;
            if (guardWords?.length) {
                const wStart = Math.max(0, m.index - 150);
                const wEnd   = Math.min(text.length, m.index + m[0].length + 150);
                const win = text.substring(wStart, wEnd).toLowerCase();
                if (guardWords.some(gw => win.includes(gw.toLowerCase()))) continue;
            }
            for (let i = m.index; i < m.index + m[0].length; i++) used.add(i);

            // Check context window for "learning" keyword
            const ctxStart = Math.max(0, m.index - 30);
            const ctxEnd = Math.min(text.length, m.index + m[0].length + 30);
            const context = text.substring(ctxStart, ctxEnd).toLowerCase();
            const isLearning = /learning|in progress|studying/.test(context);

            skills.push({
                name: canonical,
                category,
                level: isLearning ? 1 : 2, // L1 if learning, L2 max
                source: 'Technical Skills',
                context: context.trim(),
            });
        }
    }
    return skills;
}

// Extract skills from EDUCATION section
// Coursework with grade = L2, mentioned only = L1
function extractSkillsFromEducation(text) {
    const skills = [];
    if (!text) return skills;

    const entries = registry.getAllSkillEntries();

    const used = new Set();
    for (const { canonical, alias, category, guardWords } of entries) {
        const isRegex = alias.includes('\\b') || alias.includes('(?');
        let pattern;
        if (alias.toLowerCase().includes('c#')) {
            pattern = new RegExp(escapeRegex(alias), 'gi');
        } else {
            pattern = isRegex
                ? new RegExp(alias, 'gi')
                : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi');
        }

        let m;
        while ((m = pattern.exec(text)) !== null) {
            let alreadyUsed = false;
            for (let i = m.index; i < m.index + m[0].length; i++) {
                if (used.has(i)) { alreadyUsed = true; break; }
            }
            if (alreadyUsed) continue;
            if (guardWords?.length) {
                const wStart = Math.max(0, m.index - 150);
                const wEnd   = Math.min(text.length, m.index + m[0].length + 150);
                const win = text.substring(wStart, wEnd).toLowerCase();
                if (guardWords.some(gw => win.includes(gw.toLowerCase()))) continue;
            }
            for (let i = m.index; i < m.index + m[0].length; i++) used.add(i);

            const ctxStart = Math.max(0, m.index - 60);
            const ctxEnd = Math.min(text.length, m.index + m[0].length + 60);
            const context = text.substring(ctxStart, ctxEnd);

            // Check for grade (A, B+, A-, B) = L2, otherwise L1
            const hasGrade = /\([AB][+-]?\)/.test(context);
            const isLearning = /learning|in progress|studying/i.test(context);

            skills.push({
                name: canonical,
                category,
                level: isLearning ? 1 : hasGrade ? 2 : 1,
                source: 'Education',
                context: context.trim(),
            });
        }
    }
    return skills;
}

// Extract skills from PROJECTS section
// Used in project = L2
function extractSkillsFromProjects(text) {
    const skills = [];
    if (!text) return skills;

    const entries = registry.getAllSkillEntries();

    const used = new Set();
    for (const { canonical, alias, category, guardWords } of entries) {
        const isRegex = alias.includes('\\b') || alias.includes('(?');
        let pattern;
        if (alias.toLowerCase().includes('c#')) {
            pattern = new RegExp(escapeRegex(alias), 'gi');
        } else {
            pattern = isRegex
                ? new RegExp(alias, 'gi')
                : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi');
        }

        let m;
        while ((m = pattern.exec(text)) !== null) {
            let alreadyUsed = false;
            for (let i = m.index; i < m.index + m[0].length; i++) {
                if (used.has(i)) { alreadyUsed = true; break; }
            }
            if (alreadyUsed) continue;
            if (guardWords?.length) {
                const wStart = Math.max(0, m.index - 150);
                const wEnd   = Math.min(text.length, m.index + m[0].length + 150);
                const win = text.substring(wStart, wEnd).toLowerCase();
                if (guardWords.some(gw => win.includes(gw.toLowerCase()))) continue;
            }
            for (let i = m.index; i < m.index + m[0].length; i++) used.add(i);

            const ctxStart = Math.max(0, m.index - 60);
            const ctxEnd = Math.min(text.length, m.index + m[0].length + 60);
            const context = text.substring(ctxStart, ctxEnd);

            skills.push({
                name: canonical,
                category,
                level: 2, // Project use = L2
                source: 'Projects',
                context: context.trim(),
            });
        }
    }
    return skills;
}

// Extract skills from PROFESSIONAL EXPERIENCE
// Only from tech roles, cap at L3 for recent roles
const TECH_ROLE_KEYWORDS = [
    'engineer', 'developer', 'programmer', 'analyst',
    'data', 'software', 'machine learning', 'ai', 'ml',
    'architect', 'devops', 'backend', 'frontend', 'fullstack'
];

function isTechRole(jobTitle) {
    const lower = jobTitle.toLowerCase();
    return TECH_ROLE_KEYWORDS.some(kw => lower.includes(kw));
}

function extractSkillsFromExperience(text) {
    const skills = [];
    if (!text) return skills;

    // Split into individual job blocks
    const jobBlocks = text.split(/\n(?=[A-Z][a-z].*\|)/);

    for (const block of jobBlocks) {
        // Get job title (first line of block)
        const titleLine = block.split('\n')[0];
        if (!isTechRole(titleLine)) continue; // Skip non-tech roles

        const entries = registry.getAllSkillEntries();

        const used = new Set();
        for (const { canonical, alias, category, guardWords } of entries) {
            const isRegex = alias.includes('\\b') || alias.includes('(?');
            let pattern;
            if (alias.toLowerCase().includes('c#')) {
                pattern = new RegExp(escapeRegex(alias), 'gi');
            } else {
                pattern = isRegex
                    ? new RegExp(alias, 'gi')
                    : new RegExp(`\\b${escapeRegex(alias)}\\b`, 'gi');
            }

            let m;
            while ((m = pattern.exec(block)) !== null) {
                let alreadyUsed = false;
                for (let i = m.index; i < m.index + m[0].length; i++) {
                    if (used.has(i)) { alreadyUsed = true; break; }
                }
                if (alreadyUsed) continue;
                if (guardWords?.length) {
                    const wStart = Math.max(0, m.index - 150);
                    const wEnd   = Math.min(block.length, m.index + m[0].length + 150);
                    const win = block.substring(wStart, wEnd).toLowerCase();
                    if (guardWords.some(gw => win.includes(gw.toLowerCase()))) continue;
                }
                for (let i = m.index; i < m.index + m[0].length; i++) used.add(i);

                const ctxStart = Math.max(0, m.index - 60);
                const ctxEnd = Math.min(block.length, m.index + m[0].length + 60);
                const context = block.substring(ctxStart, ctxEnd);

                skills.push({
                    name: canonical,
                    category,
                    level: 3, // Professional experience = L3
                    source: 'Experience',
                    context: context.trim(),
                });
            }
        }
    }
    return skills;
}

// Main resume parser - merges all sections, deduplicates, takes highest level
export function parseResumeText(text) {
    if (!text || !text.trim()) return [];

    const sections = extractResumeSections(text);

    const techSkills = extractSkillsFromTechnicalSection(sections.technicalSkills);
    const eduSkills = extractSkillsFromEducation(sections.education);
    const projSkills = extractSkillsFromProjects(sections.projects);
    const expSkills = extractSkillsFromExperience(sections.experience);

    // Merge, keeping highest level per skill
    const merged = new Map();

    const allSkills = [...eduSkills, ...techSkills, ...projSkills, ...expSkills];

    for (const skill of allSkills) {
        const existing = merged.get(skill.name);
        if (!existing) {
            merged.set(skill.name, { ...skill });
        } else {
            // Take highest level
            if (skill.level > existing.level) {
                merged.set(skill.name, { ...skill });
            }
        }
    }

    return Array.from(merged.values()).sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return a.name.localeCompare(b.name);
    });
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

            {/* Role Template Comparison */}
            {(() => {
                const roleTemplate = registry.matchRole(jobRole);
                if (!roleTemplate) return null;

                const comparison = compareSkillsToRole(results, roleTemplate);
                if (!comparison) return null;

                return (
                    <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#92400e', marginBottom: '10px' }}>
                            Role Template: {roleTemplate.role}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
                            <div>
                                <div style={{ color: '#92400e', fontWeight: '600' }}>Critical</div>
                                <div style={{ color: '#b45309' }}>{comparison.matched.critical.length}/{roleTemplate.critical.length} ({(comparison.coverage.critical * 100).toFixed(0)}%)</div>
                                {comparison.missing.critical.length > 0 && (
                                    <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>Missing: {comparison.missing.critical.join(', ')}</div>
                                )}
                            </div>
                            <div>
                                <div style={{ color: '#92400e', fontWeight: '600' }}>Required</div>
                                <div style={{ color: '#b45309' }}>{comparison.matched.required.length}/{roleTemplate.required.length} ({(comparison.coverage.required * 100).toFixed(0)}%)</div>
                                {comparison.missing.required.length > 0 && (
                                    <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>Missing: {comparison.missing.required.join(', ')}</div>
                                )}
                            </div>
                            <div>
                                <div style={{ color: '#92400e', fontWeight: '600' }}>Preferred</div>
                                <div style={{ color: '#b45309' }}>{comparison.matched.preferred.length}/{roleTemplate.preferred.length} ({(comparison.coverage.preferred * 100).toFixed(0)}%)</div>
                                {comparison.missing.preferred.length > 0 && (
                                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '4px' }}>Missing: {comparison.missing.preferred.join(', ')}</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Stats Section - Using inline styles */}
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Overview</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '125px 125px 125px 125px', gap: '16px' }}>
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
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
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

function GapAnalysisView({ gap, companyName, jobRole, jobMeta }) {
    if (!gap) return null;

    const { critical, levelGaps, matched, bonus } = gap;
    const totalJD = critical.length + levelGaps.length + matched.length;
    const score = totalJD > 0 ? Math.round((matched.length / totalJD) * 100) : 0;

    const scoreColor = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626';
    const scoreLabel = score >= 70 ? 'Strong Match' : score >= 40 ? 'Partial Match' : 'Weak Match';



    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Header */}

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
                <div style={{ display: 'grid', gridTemplateColumns: '125px 125px 125px 125px 125px', gap: '16px', alignItems: 'center' }}>
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
                <div style={{ backgroundColor: 'white', border: '1px solid #fecaca', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ❌ Missing Skills ({critical.length})
                        </span>
                        <span style={{ fontSize: '11px', color: '#991b1b', marginLeft: '8px' }}>Not found in your resume</span>
                    </div>
                    {critical.map((skill, idx) => (
                        <div key={skill.name} style={{ padding: '8px 16px', borderBottom: idx < critical.length - 1 ? '1px solid #fef2f2' : 'none', display: 'grid', gridTemplateColumns: '140px 140px 140px 140px', gap: '8px', alignItems: 'center', backgroundColor: idx % 2 === 0 ? 'white' : '#fff5f5' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{skill.name}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>{skill.category}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>Required: L{skill.level}</div>
                            <div><ImportanceBadge importance={skill.importance} /></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Level Gaps */}
            {levelGaps.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #fed7aa', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⚠️ Level Gaps ({levelGaps.length})
                        </span>
                        <span style={{ fontSize: '11px', color: '#92400e', marginLeft: '8px' }}>You have these but need more depth</span>
                    </div>
                    {levelGaps.map((skill, idx) => (
                        <div key={skill.name} style={{ padding: '8px 16px', borderBottom: idx < levelGaps.length - 1 ? '1px solid #fff7ed' : 'none', display: 'grid', gridTemplateColumns: '140px 140px 140px 140px', gap: '8px', alignItems: 'center', backgroundColor: idx % 2 === 0 ? 'white' : '#fffbeb' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{skill.name}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>{skill.category}</div>
                            <div style={{ fontSize: '12px', color: '#d97706' }}>
                                Your L{skill.resumeLevel} → Need L{skill.level}
                            </div>
                            <div><ImportanceBadge importance={skill.importance} /></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Matched Skills */}
            {matched.length > 0 && (
                <div style={{ backgroundColor: 'white', border: '1px solid #bbf7d0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ✅ Matched Skills ({matched.length})
                        </span>
                        <span style={{ fontSize: '11px', color: '#065f46', marginLeft: '8px' }}>You meet or exceed the requirement</span>
                    </div>
                    {matched.map((skill, idx) => (
                        <div key={skill.name} style={{ padding: '8px 16px', borderBottom: idx < matched.length - 1 ? '1px solid #f0fdf4' : 'none', display: 'grid', gridTemplateColumns: '140px 140px 140px 140px', gap: '8px', alignItems: 'center', backgroundColor: idx % 2 === 0 ? 'white' : '#f0fdf4' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{skill.name}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>{skill.category}</div>
                            <div style={{ fontSize: '12px', color: '#059669' }}>
                                Your L{skill.resumeLevel} · {LEVEL_NAMES[skill.resumeLevel]}
                            </div>
                            <div><ImportanceBadge importance={skill.importance} /></div>
                        </div>
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

        </div>
    );
}

function ResumeResultsView({ results }) {
    const SOURCE_COLORS = {
        'Technical Skills': '#0369a1',
        'Education': '#7c3aed',
        'Projects': '#059669',
        'Experience': '#d97706',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Stats */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '12px' }}>Your Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Skills</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{results.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>L2 Novice</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed' }}>{results.filter(s => s.level === 2).length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>L1 Awareness</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#64748b' }}>{results.filter(s => s.level === 1).length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Avg Level</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>
                            {(results.reduce((s, r) => s + r.level, 0) / results.length).toFixed(1)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Skills Table */}
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 8px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '150px 150px 100px 120px', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Skill</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Category</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Level</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Source</div>
                </div>
                <div>
                    {results.map((skill, idx) => (
                        <div key={skill.name} style={{ padding: '8px', borderBottom: idx < results.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'grid', gridTemplateColumns: '150px 150px 100px 120px', gap: '8px', alignItems: 'center', backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                            <div style={{ fontWeight: '500', color: '#0f172a', fontSize: '14px' }}>{skill.name}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>{skill.category}</div>
                            <div style={{ fontSize: '12px', color: '#475569' }}>L{skill.level} · {LEVEL_NAMES[skill.level]}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: SOURCE_COLORS[skill.source] || '#64748b' }}>{skill.source}</div>
                        </div>
                    ))}
                </div>
            </div>
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

function Legend() {
    return (
        <div className="mt-10 pt-8 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Classification reference</h3>
            <div className="grid md:grid-cols-2 gap-6 text-xs text-slate-600">
                <div>
                    <h4 className="font-medium text-slate-700 mb-2 uppercase tracking-wider text-[10px]">
                        Proficiency Levels (OPM 5-Level Scale)
                    </h4>
                    <ul className="space-y-1.5">
                        <li><span className="font-semibold text-slate-900">L1 · Awareness</span> — basic familiarity; can recognize but not apply</li>
                        <li><span className="font-semibold text-slate-900">L2 · Novice</span> — limited practical experience; needs guidance</li>
                        <li><span className="font-semibold text-slate-900">L3 · Intermediate</span> — independent on routine tasks</li>
                        <li><span className="font-semibold text-slate-900">L4 · Advanced</span> — applied theory; can teach others</li>
                        <li><span className="font-semibold text-slate-900">L5 · Expert</span> — recognized authority; innovates</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-medium text-slate-700 mb-2 uppercase tracking-wider text-[10px]">
                        Importance Tiers (inferred from JD sections)
                    </h4>
                    <ul className="space-y-1.5">
                        <li><span className="font-semibold text-rose-700">Critical</span> — Required / Must-Have / Minimum Qualifications</li>
                        <li><span className="font-semibold text-amber-700">Required</span> — Qualifications / general requirements</li>
                        <li><span className="font-semibold text-sky-700">Preferred</span> — Preferred / Desired</li>
                        <li><span className="font-semibold text-slate-600">Nice-to-have</span> — Bonus / Plus / Nice-to-have</li>
                    </ul>

                    <div>
                        <h4 className="font-medium text-slate-700 mb-2 uppercase tracking-wider text-[10px]">
                            Phrase Detection
                        </h4>
                        <ul className="space-y-1.5">
                            <li><span className="font-semibold text-slate-900">"expert"</span> → L5</li>
                            <li><span className="font-semibold text-slate-900">"strong / proficient"</span> → L4</li>
                            <li><span className="font-semibold text-slate-900">"experience with"</span> → L3</li>
                            <li><span className="font-semibold text-slate-900">"familiarity"</span> → L2</li>
                            <li><span className="font-semibold text-slate-900">"exposure"</span> → L1</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-700 mb-2 uppercase tracking-wider text-[10px]">
                            Years of Experience
                        </h4>
                        <ul className="space-y-1.5">
                            <li><span className="font-semibold text-slate-900">7+ yrs</span> ≈ L5 · Expert</li>
                            <li><span className="font-semibold text-slate-900">4–6 yrs</span> ≈ L4 · Advanced</li>
                            <li><span className="font-semibold text-slate-900">2–3 yrs</span> ≈ L3 · Intermediate</li>
                            <li><span className="font-semibold text-slate-900">&lt;2 yrs</span> ≈ L2 · Novice</li>
                        </ul>
                    </div>


                </div>
            </div>

        </div>
    );
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
        } else if (resumeSkill.level < jdSkill.level || resumeSkill.level === 0) {
            // Have it but below required level
            levelGaps.push({
                ...jdSkill,
                resumeLevel: resumeSkill.level,
                gap: jdSkill.level - resumeSkill.level,
            });
        } else {
            // Have it at or above required level
            matched.push({
                ...jdSkill,
                resumeLevel: resumeSkill.level,
                gap: 0,
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

// ============================================================
// MAIN - APP
// ============================================================

export default function App() {
    const [activeTab, setActiveTab] = useState('jd');
    const [input, setInput] = useState(SAMPLE_JD);
    const [companyName, setCompanyName] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [results, setResults] = useState(null);
    const [resumeInput, setResumeInput] = useState('');
    const [resumeResults, setResumeResults] = useState(null);
    const [jobMeta, setJobMeta] = useState(null);

    const parse = () => {
        const { companyName: extractedCompany, jobRole: extractedRole } = parseCompanyAndRole(input);
        const meta = parseJobMeta(input);
        setCompanyName(extractedCompany);
        setJobRole(extractedRole);
        setJobMeta(meta);
        const jdResults = parseJobDescription(input);
        setResults(jdResults);
        if (resumeResults && resumeResults.length > 0) {
            setActiveTab('compare');
        }
    }

    const parseResume = () => {
        const parsed = parseResumeInput(resumeInput, 'text');
        setResumeResults(parsed);
        // Auto-switch to Gap Analysis if JD already parsed
        if (results && results.length > 0) {
            setActiveTab('compare');
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
        <div className="min-h-screen bg-stone-50 text-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8 md:py-10">

                {/* Header */}
                <header className="mb-8">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 mb-2">
                        <span>OPM 5-Level Scale</span>
                        <span>·</span>
                        <span>Lightcast Skill Taxonomy</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        Tech Job Skill Parser
                    </h1>
                    <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
                        Parses tech job descriptions into structured skill profiles with
                        required proficiency levels and criticality. Best used for Software
                        Engineering, ML/AI, and Data Science roles.
                    </p>
                </header>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
                    {[
                        { key: 'jd', label: 'Parse JD' },
                        { key: 'resume', label: 'Parse Resume' },
                        { key: 'compare', label: 'Gap Analysis' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '8px 20px',
                                fontSize: '13px',
                                fontWeight: '600',
                                border: 'none',
                                borderBottom: activeTab === tab.key ? '2px solid #0f172a' : '2px solid transparent',
                                background: 'none',
                                color: activeTab === tab.key ? '#0f172a' : '#64748b',
                                cursor: 'pointer',
                                marginBottom: '-2px',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* JD Parser Tab */}
                {activeTab === 'jd' && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
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
                                </div>
                            </div>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                className="w-full h-[520px] p-4 border border-slate-200 rounded-lg font-mono text-[13px] leading-relaxed bg-white shadow-sm focus:ring-2 focus:ring-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                                placeholder="Paste a job description here..."
                            />
                            <button
                                onClick={parse}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition shadow-sm"
                            >
                                Parse Skills →
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Required Skill Profile
                                </h2>
                                {results && results.length > 0 && (
                                    <button
                                        onClick={exportJson}
                                        className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                    >
                                        Export JSON
                                    </button>
                                )}
                            </div>
                            {results === null ? (
                                <div className="text-sm text-slate-500 p-12 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                    Paste a job description and click <b>Parse Skills</b> to see
                                    the structured requirement profile.
                                </div>
                            ) : (
                                <ResultsView results={results} companyName={companyName} jobRole={jobRole} jobMeta={jobMeta} />
                            )}
                        </div>
                    </div>
                )}

                {/* Resume Parser Tab */}
                {activeTab === 'resume' && (
                    <div className="grid lg:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Resume
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setResumeInput(''); setResumeResults(null); }}
                                        className="text-xs px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-100 transition"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        disabled
                                        style={{ opacity: 0.4, cursor: 'not-allowed' }}
                                        className="text-xs px-2.5 py-1 border border-slate-300 rounded"
                                        title="PDF upload coming soon"
                                    >
                                        Upload PDF (soon)
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={resumeInput}
                                onChange={e => setResumeInput(e.target.value)}
                                className="w-full h-[520px] p-4 border border-slate-200 rounded-lg font-mono text-[13px] leading-relaxed bg-white shadow-sm focus:ring-2 focus:ring-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                                placeholder="Paste your resume text here..."
                            />
                            <button
                                onClick={parseResume}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition shadow-sm"
                            >
                                Parse Resume →
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Your Skill Profile
                            </h2>
                            {resumeResults === null ? (
                                <div className="text-sm text-slate-500 p-12 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                    Paste your resume and click <b>Parse Resume</b> to see your skill profile.
                                </div>
                            ) : resumeResults.length === 0 ? (
                                <div className="text-sm text-slate-500 p-8 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                    No recognized skills detected. Make sure your resume has a TECHNICAL SKILLS or EDUCATION section.
                                </div>
                            ) : (
                                <ResumeResultsView results={resumeResults} />
                            )}
                        </div>
                    </div>
                )}

                {/* Gap Analysis Tab */}
                {activeTab === 'compare' && (
                    <div>
                        {(!results || !resumeResults) ? (
                            <div className="text-sm text-slate-500 p-12 text-center border border-dashed border-slate-300 rounded-lg bg-white">
                                <div style={{ marginBottom: '12px' }}>Complete both steps first:</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <div style={{ color: results ? '#059669' : '#dc2626' }}>
                                        {results ? '✅' : '❌'} Job Description
                                    </div>
                                    <div style={{ color: resumeResults ? '#059669' : '#dc2626' }}>
                                        {resumeResults ? '✅' : '❌'} Resume
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <GapAnalysisView gap={runGapAnalysis(results, resumeResults)} companyName={companyName} jobRole={jobRole} jobMeta={jobMeta} />
                        )}
                    </div>
                )}

                <Legend />

            </div>
        </div>
    );
}
