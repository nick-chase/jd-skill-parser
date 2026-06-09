/**
 * Integration tests for parser functions in src/jd-skill-parser.jsx
 *
 * Design notes for the team lead:
 *
 * - "Integration" here means: real text in, real extracted skills out. We feed
 *   the actual fixture files and assert on specific fields in the returned
 *   objects. Nothing is mocked.
 *
 * - Tests in parseJobDescription and parseResumeText use the fixture files.
 *   Tests in runGapAnalysis use small synthetic arrays constructed inline.
 *   Reason: gap-analysis logic is orthogonal to extraction logic. Inline arrays
 *   isolate one concern per test and remove fixture noise.
 *
 * - Level and importance values are asserted on confirmed parser output, verified
 *   by running the parser directly against the fixtures before writing these tests.
 *   If skills.json changes, add a temporary console.log test to re-derive ground truth.
 *
 * - The guardWords test (Spring Boot) is the most important regression guard in
 *   this file. "spring season" in the JD is the only thing preventing Spring Boot
 *   from being extracted -- if guardWords logic breaks, this test catches it first.
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  parseJobDescription,
  parseResumeText,
  runGapAnalysis,
  runBehavioralGap,
  parseJobMeta,
} from '../../src/jd-skill-parser.jsx';

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

// import.meta.url gives the absolute URL of this test file, so fixture paths
// resolve correctly regardless of which directory vitest is invoked from.
const jdUrl     = new URL('../fixtures/sample-jd.txt',     import.meta.url);
const resumeUrl = new URL('../fixtures/sample-resume.txt', import.meta.url);

const jdText     = readFileSync(jdUrl,     'utf-8');
const resumeText = readFileSync(resumeUrl, 'utf-8');

// ---------------------------------------------------------------------------
// parseJobDescription() -- fixture-based tests
// ---------------------------------------------------------------------------

describe('parseJobDescription() -- result shape', () => {
  // Parse once and share. Re-parsing per test is slower and adds no coverage.
  const result = parseJobDescription(jdText);

  test('returns an object with technicalSignals, behavioralSignals, and jobDuties', () => {
    expect(result).toHaveProperty('technicalSignals');
    expect(result).toHaveProperty('behavioralSignals');
    expect(result).toHaveProperty('jobDuties');
    expect(Array.isArray(result.technicalSignals)).toBe(true);
    expect(Array.isArray(result.behavioralSignals)).toBe(true);
    expect(Array.isArray(result.jobDuties)).toBe(true);
  });
});

describe('parseJobDescription() -- empty / whitespace input returns correct shape', () => {
  test('empty string returns object with empty arrays, not []', () => {
    const result = parseJobDescription('');
    expect(result).toHaveProperty('technicalSignals');
    expect(result).toHaveProperty('behavioralSignals');
    expect(result).toHaveProperty('jobDuties');
    expect(result).toHaveProperty('degree');
    expect(Array.isArray(result.technicalSignals)).toBe(true);
    expect(result.technicalSignals).toHaveLength(0);
  });

  test('whitespace-only string returns object with empty arrays, not []', () => {
    const result = parseJobDescription('   \n\t  ');
    expect(result).toHaveProperty('technicalSignals');
    expect(Array.isArray(result.technicalSignals)).toBe(true);
    expect(result.technicalSignals).toHaveLength(0);
  });

  test('null returns object with empty arrays, not []', () => {
    const result = parseJobDescription(null);
    expect(result).toHaveProperty('technicalSignals');
    expect(Array.isArray(result.technicalSignals)).toBe(true);
  });
});

describe('parseJobDescription() -- technicalSignals extraction from sample JD', () => {
  const { technicalSignals: jdSkills } = parseJobDescription(jdText);

  test('returns a non-empty technicalSignals array', () => {
    expect(Array.isArray(jdSkills)).toBe(true);
    expect(jdSkills.length).toBeGreaterThan(0);
  });

  test('extracts Python from the sample JD', () => {
    const names = jdSkills.map((s) => s.name);
    expect(names).toContain('Python');
  });

  test('extracts Machine Learning from the sample JD', () => {
    const names = jdSkills.map((s) => s.name);
    expect(names).toContain('Machine Learning');
  });

  test('extracts Docker from the sample JD', () => {
    const names = jdSkills.map((s) => s.name);
    expect(names).toContain('Docker');
  });

  test('every technical signal has shape: name, category, level (number), importance (number)', () => {
    for (const skill of jdSkills) {
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('category');
      expect(typeof skill.level).toBe('number');
      expect(typeof skill.importance).toBe('number');
    }
  });

  test('Machine Learning has importance 5 (Critical) from the Required Skills section', () => {
    const ml = jdSkills.find((s) => s.name === 'Machine Learning');
    expect(ml).toBeDefined();
    expect(ml.importance).toBe(5);
  });

  test('technicalSignals are sorted by descending importance', () => {
    for (let i = 0; i < jdSkills.length - 1; i++) {
      expect(jdSkills[i].importance).toBeGreaterThanOrEqual(jdSkills[i + 1].importance);
    }
  });
});

describe('parseJobDescription() -- behavioralSignals extraction from sample JD', () => {
  const { behavioralSignals } = parseJobDescription(jdText);

  test('returns a non-empty behavioralSignals array', () => {
    expect(Array.isArray(behavioralSignals)).toBe(true);
    expect(behavioralSignals.length).toBeGreaterThan(0);
  });

  test('every behavioral signal has name and category — no level field', () => {
    // Regression guard: behavioral signals must never carry L1–L5 scoring.
    for (const signal of behavioralSignals) {
      expect(signal).toHaveProperty('name');
      expect(signal).toHaveProperty('category');
      expect(signal).not.toHaveProperty('level');
      expect(signal).not.toHaveProperty('importance');
    }
  });

  test('detects Problem-Solving from sample JD', () => {
    // Sample JD contains "Problem solving abilities" in the requirements section.
    const names = behavioralSignals.map((s) => s.name);
    expect(names).toContain('Problem-Solving');
  });
});

describe('parseJobDescription() -- jobDuties extraction from sample JD', () => {
  const { jobDuties } = parseJobDescription(jdText);

  test('returns a non-empty jobDuties array', () => {
    // Sample JD has a "What You'll Do" section with bullet points.
    expect(Array.isArray(jobDuties)).toBe(true);
    expect(jobDuties.length).toBeGreaterThan(0);
  });

  test('every duty is a non-empty string', () => {
    for (const duty of jobDuties) {
      expect(typeof duty).toBe('string');
      expect(duty.length).toBeGreaterThan(0);
    }
  });

  test('jobDuties contains at most 10 items', () => {
    expect(jobDuties.length).toBeLessThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// parseJobDescription() -- guardWords regression
// ---------------------------------------------------------------------------

describe('parseJobDescription() -- guardWords suppress false positives', () => {
  // --- Spring Boot ---
  test("does NOT extract Spring Boot when 'spring season' appears in the JD", () => {
    // The sample JD says "We love the spring season here in Austin."
    // Spring Boot's guardWords include "spring season". If guardWords logic breaks,
    // Spring Boot appears as a required skill in a JD that never mentions the framework.
    const { technicalSignals } = parseJobDescription(jdText);
    expect(technicalSignals.map((s) => s.name)).not.toContain('Spring Boot');
  });

  test("does NOT extract Spring Boot from a sentence containing only 'spring season'", () => {
    // Isolated synthetic text makes the guardWord assertion unambiguous.
    const synthetic = 'We love the spring season here and fresh ideas from the team.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).not.toContain('Spring Boot');
  });

  test("DOES extract Spring Boot from 'Spring framework for enterprise apps'", () => {
    const synthetic = 'Must have experience with the Spring framework for enterprise Java applications.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).toContain('Spring Boot');
  });

  // --- Flask ---
  test("does NOT extract Flask from 'water flask' non-tech phrase", () => {
    const synthetic = 'Bring a water flask to our outdoor team-building events.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).not.toContain('Flask');
  });

  test("DOES extract Flask from 'Flask framework for Python backend'", () => {
    const synthetic = 'Build REST endpoints using the Flask framework for Python backend services.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).toContain('Flask');
  });

  // --- Express.js ---
  test("does NOT extract Express.js from 'express written consent'", () => {
    const synthetic = 'You must provide express written consent to proceed with the application.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).not.toContain('Express.js');
  });

  test("does NOT extract Express.js from 'express delivery' logistics context", () => {
    const synthetic = 'Ship hardware components via express delivery to our warehouse.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).not.toContain('Express.js');
  });

  test("DOES extract Express.js from 'Express.js REST API server'", () => {
    const synthetic = 'Build RESTful routes using Express.js for the Node.js API server.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).toContain('Express.js');
  });

  // --- Next.js ---
  test("does NOT extract Next.js from 'next steps' hiring language", () => {
    const synthetic = 'The next steps in our hiring process will be communicated by next week.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).not.toContain('Next.js');
  });

  test("DOES extract Next.js from 'Next.js' explicit tech mention", () => {
    const synthetic = 'We build our frontend with Next.js and deploy to Vercel.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).toContain('Next.js');
  });

  // --- Swift vs SWIFT ---
  test("does NOT extract Swift (language) from 'Knowledge on SWIFT preferred' banking context", () => {
    // JD7 false positive: SWIFT the financial messaging protocol was matched as
    // Swift the Apple programming language. guardWords on Swift entry now prevent this.
    const synthetic = 'Domain: Core Banking, Payment domain, Knowledge on SWIFT preferred.';
    const { technicalSignals } = parseJobDescription(synthetic);
    const names = technicalSignals.map((s) => s.name);
    expect(names).not.toContain('Swift');
  });

  test("DOES extract SWIFT (Financial) from banking SWIFT context", () => {
    const synthetic = 'Domain: Core Banking, Payment domain, Knowledge on SWIFT preferred.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).toContain('SWIFT (Financial)');
  });

  test("DOES extract Swift (language) from iOS/Apple development context", () => {
    const synthetic = 'Build native iOS applications using Swift and Xcode.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).toContain('Swift');
  });

  // --- React pattern fix (A4 regression) ---
  test("DOES extract React from 'React-based applications'", () => {
    // Pattern was previously too restrictive (required lookahead for .js/framework/etc).
    // Now matches React as a standalone word.
    const synthetic = 'Design and maintain features across C#, Java, and React-based applications.';
    const { technicalSignals } = parseJobDescription(synthetic);
    expect(technicalSignals.map((s) => s.name)).toContain('React');
  });
});

// ---------------------------------------------------------------------------
// parseResumeText() -- fixture-based tests
// ---------------------------------------------------------------------------

describe('parseResumeText() -- result shape', () => {
  const result = parseResumeText(resumeText);

  test('returns an object with technicalSignals and behavioralSignals', () => {
    expect(result).toHaveProperty('technicalSignals');
    expect(result).toHaveProperty('behavioralSignals');
    expect(Array.isArray(result.technicalSignals)).toBe(true);
    expect(Array.isArray(result.behavioralSignals)).toBe(true);
  });
});

describe('parseResumeText() -- technicalSignals extraction from sample resume', () => {
  const { technicalSignals: resumeSkills } = parseResumeText(resumeText);

  test('returns a non-empty technicalSignals array', () => {
    expect(Array.isArray(resumeSkills)).toBe(true);
    expect(resumeSkills.length).toBeGreaterThan(0);
  });

  test('every technical signal has shape: name, category, level (number), score (number), source (string), suggestion (string)', () => {
    for (const skill of resumeSkills) {
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('category');
      expect(typeof skill.level).toBe('number');
      expect(typeof skill.score).toBe('number');
      expect(skill).toHaveProperty('source');
      expect(typeof skill.suggestion).toBe('string');
    }
  });

  // B4 weighted scoring: Python appears in Technical Skills (wType=0.1) + intern Experience
  // (wType=0.7, unknown duration). Sum = 0.39, M_rec(2) = 1.2 → score ≈ 0.47 → L2 Novice.
  test('Python is level 2 -- weighted scoring: skills-section + intern experience (unknown duration)', () => {
    const python = resumeSkills.find((s) => s.name === 'Python');
    expect(python).toBeDefined();
    expect(python.level).toBe(2);
    expect(python.score).toBeGreaterThan(0.30);
    expect(python.source).toMatch(/experience/i);
  });

  // Machine Learning appears only in intern Experience (wType=0.7, unknown duration).
  // Score = 0.7 × 0.5 × 1.0 = 0.35 → L2 Novice.
  test('Machine Learning is level 2 -- intern experience, unknown duration', () => {
    const ml = resumeSkills.find((s) => s.name === 'Machine Learning');
    expect(ml).toBeDefined();
    expect(ml.level).toBe(2);
    expect(ml.source).toMatch(/experience/i);
  });

  // Docker appears only in Projects (wType=0.5, no duration stated).
  // Score = 0.5 × 0.4 × 1.0 = 0.20 → L1 Awareness.
  test('Docker is level 1 -- projects section only, no duration stated', () => {
    const docker = resumeSkills.find((s) => s.name === 'Docker');
    expect(docker).toBeDefined();
    expect(docker.level).toBe(1);
    expect(docker.source).toMatch(/project/i);
  });

  // React appears only in Technical Skills (wType=0.1, no duration).
  // Score = 0.1 × 0.4 × 1.0 = 0.04 → L1 Awareness. "Learning" phrase is expected future work.
  test('React is level 1 -- skills-section-only, no project or experience evidence', () => {
    const react = resumeSkills.find((s) => s.name === 'React');
    expect(react).toBeDefined();
    expect(react.level).toBe(1);
  });

  test('technicalSignals are sorted by descending level', () => {
    for (let i = 0; i < resumeSkills.length - 1; i++) {
      expect(resumeSkills[i].level).toBeGreaterThanOrEqual(resumeSkills[i + 1].level);
    }
  });
});

describe('parseResumeText() -- behavioralSignals extraction from sample resume', () => {
  const { behavioralSignals } = parseResumeText(resumeText);

  test('returns a non-empty behavioralSignals array', () => {
    // Sample resume SUMMARY contains "problem-solving", "attention to detail", "teamwork".
    expect(Array.isArray(behavioralSignals)).toBe(true);
    expect(behavioralSignals.length).toBeGreaterThan(0);
  });

  test('every behavioral signal has name and category — no level field', () => {
    for (const signal of behavioralSignals) {
      expect(signal).toHaveProperty('name');
      expect(signal).toHaveProperty('category');
      expect(signal).not.toHaveProperty('level');
    }
  });

  test('detects Problem-Solving from resume SUMMARY', () => {
    const names = behavioralSignals.map((s) => s.name);
    expect(names).toContain('Problem-Solving');
  });

  test('detects Teamwork from resume SUMMARY', () => {
    const names = behavioralSignals.map((s) => s.name);
    expect(names).toContain('Teamwork');
  });
});

// ---------------------------------------------------------------------------
// runBehavioralGap() -- synthetic arrays
// ---------------------------------------------------------------------------

describe('runBehavioralGap() -- synthetic arrays', () => {
  test('returns null when either argument is null or undefined', () => {
    expect(runBehavioralGap(null, [])).toBeNull();
    expect(runBehavioralGap([], null)).toBeNull();
    expect(runBehavioralGap(null, null)).toBeNull();
  });

  test('returns an object with matched and missing arrays', () => {
    const result = runBehavioralGap([], []);
    expect(result).toHaveProperty('matched');
    expect(result).toHaveProperty('missing');
    expect(Array.isArray(result.matched)).toBe(true);
    expect(Array.isArray(result.missing)).toBe(true);
  });

  test('JD signal present on resume goes to matched[]', () => {
    const jd     = [{ name: 'Communication', category: 'Communication' }];
    const resume = [{ name: 'Communication', category: 'Communication' }];
    const { matched, missing } = runBehavioralGap(jd, resume);
    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe('Communication');
    expect(missing).toHaveLength(0);
  });

  test('JD signal absent from resume goes to missing[]', () => {
    const jd     = [{ name: 'Leadership', category: 'Leadership' }];
    const resume = [{ name: 'Communication', category: 'Communication' }];
    const { matched, missing } = runBehavioralGap(jd, resume);
    expect(missing).toHaveLength(1);
    expect(missing[0].name).toBe('Leadership');
    expect(matched).toHaveLength(0);
  });

  test('resume signals not in JD are ignored (no bonus for behavioral)', () => {
    const jd     = [{ name: 'Teamwork', category: 'Teamwork' }];
    const resume = [
      { name: 'Teamwork',      category: 'Teamwork' },
      { name: 'Adaptability',  category: 'Adaptability' },
    ];
    const { matched, missing } = runBehavioralGap(jd, resume);
    expect(matched).toHaveLength(1);
    expect(missing).toHaveLength(0);
  });

  test('combined scenario: mixed matched and missing', () => {
    const jd = [
      { name: 'Communication', category: 'Communication' },
      { name: 'Problem-Solving', category: 'Problem-Solving' },
      { name: 'Leadership', category: 'Leadership' },
    ];
    const resume = [
      { name: 'Communication', category: 'Communication' },
      { name: 'Problem-Solving', category: 'Problem-Solving' },
    ];
    const { matched, missing } = runBehavioralGap(jd, resume);
    expect(matched.map(s => s.name)).toContain('Communication');
    expect(matched.map(s => s.name)).toContain('Problem-Solving');
    expect(missing.map(s => s.name)).toContain('Leadership');
  });
});

// runGapAnalysis() -- synthetic arrays (isolates gap logic from extraction)
// ---------------------------------------------------------------------------

describe('runGapAnalysis() -- synthetic arrays', () => {
  test('returns an object with critical, levelGaps, matched, and bonus arrays', () => {
    // Structural guard. All four arrays must always be present even when empty,
    // so callers can iterate them without null checks.
    const result = runGapAnalysis([], []);
    expect(result).toHaveProperty('critical');
    expect(result).toHaveProperty('levelGaps');
    expect(result).toHaveProperty('matched');
    expect(result).toHaveProperty('bonus');
  });

  test('returns null when either argument is null or undefined', () => {
    // Guards the early-return: if (!jdSkills || !resumeSkills) return null.
    expect(runGapAnalysis(null, [])).toBeNull();
    expect(runGapAnalysis([], null)).toBeNull();
    expect(runGapAnalysis(null, null)).toBeNull();
  });

  test('JD skill absent from resume goes to critical[]', () => {
    // "Missing entirely" path: JD requires AWS, resume has no AWS entry.
    const jd     = [{ name: 'AWS', category: 'Cloud', level: 3, importance: 4 }];
    const resume = [];
    const { critical, levelGaps, matched, bonus } = runGapAnalysis(jd, resume);

    expect(critical).toHaveLength(1);
    expect(critical[0].name).toBe('AWS');
    expect(levelGaps).toHaveLength(0);
    expect(matched).toHaveLength(0);
    expect(bonus).toHaveLength(0);
  });

  test('resume level < JD level routes skill to levelGaps[]', () => {
    // Validates the fix for known bug #1 in CLAUDE.md:
    // "matched-skills logic counts a skill as matched even when resume level
    //  << required level". The current code routes under-leveled skills to
    // levelGaps[], not matched[]. Reverting that logic would break this test.
    const jd     = [{ name: 'Python', category: 'Language', level: 3, importance: 5 }];
    const resume = [{ name: 'Python', category: 'Language', level: 2, source: 'Technical Skills' }];
    const { critical, levelGaps, matched } = runGapAnalysis(jd, resume);

    expect(levelGaps).toHaveLength(1);
    expect(levelGaps[0].name).toBe('Python');
    expect(levelGaps[0].resumeLevel).toBe(2);
    expect(levelGaps[0].gap).toBe(1); // jdLevel(3) - resumeLevel(2) = 1
    expect(critical).toHaveLength(0);
    expect(matched).toHaveLength(0);
  });

  test('resume level >= JD level routes skill to matched[]', () => {
    // "Have it at or above required level" path.
    const jd     = [{ name: 'Docker', category: 'DevOps', level: 2, importance: 4 }];
    const resume = [{ name: 'Docker', category: 'DevOps', level: 3, source: 'Experience' }];
    const { critical, levelGaps, matched } = runGapAnalysis(jd, resume);

    expect(matched).toHaveLength(1);
    expect(matched[0].name).toBe('Docker');
    expect(matched[0].resumeLevel).toBe(3);
    expect(critical).toHaveLength(0);
    expect(levelGaps).toHaveLength(0);
  });

  test('resume skill not in JD goes to bonus[]', () => {
    // Skills the candidate has that the JD did not ask for. These are not
    // penalized -- they are surfaced as potential differentiators.
    const jd     = [{ name: 'Python',  category: 'Language', level: 3, importance: 5 }];
    const resume = [
      { name: 'Python',  category: 'Language', level: 3, source: 'Experience' },
      { name: 'Tableau', category: 'Data Viz', level: 2, source: 'Projects' },
    ];
    const { bonus } = runGapAnalysis(jd, resume);

    expect(bonus).toHaveLength(1);
    expect(bonus[0].name).toBe('Tableau');
  });

  test('combined scenario: each skill routes to the correct bucket', () => {
    // End-to-end smoke covering all four buckets in one call.
    // Use named comments to make the intent of each data fixture line obvious.
    const jd = [
      { name: 'Python', category: 'Language', level: 3, importance: 5 }, // resume L2 -> levelGap
      { name: 'AWS',    category: 'Cloud',    level: 2, importance: 4 }, // absent    -> critical
      { name: 'Docker', category: 'DevOps',   level: 2, importance: 4 }, // resume L3 -> matched
    ];
    const resume = [
      { name: 'Python',  category: 'Language', level: 2, source: 'Technical Skills' },
      { name: 'Docker',  category: 'DevOps',   level: 3, source: 'Experience' },
      { name: 'Tableau', category: 'Data Viz', level: 2, source: 'Projects' }, // bonus
    ];
    const { critical, levelGaps, matched, bonus } = runGapAnalysis(jd, resume);

    expect(critical.map((s) => s.name)).toContain('AWS');
    expect(levelGaps.map((s) => s.name)).toContain('Python');
    expect(matched.map((s) => s.name)).toContain('Docker');
    expect(bonus.map((s) => s.name)).toContain('Tableau');
  });
});

// ---------------------------------------------------------------------------
// parseJobMeta() -- fixture-based tests
// ---------------------------------------------------------------------------

describe('parseJobMeta() -- metadata extraction from sample JD', () => {
  const meta = parseJobMeta(jdText);

  test('returns a non-null object', () => {
    // Catches total failure early so subsequent assertions have meaningful messages.
    expect(meta).toBeTruthy();
    expect(typeof meta).toBe('object');
  });

  test("jobType is 'Full-time'", () => {
    // The JD header is "Austin, TX · Hybrid · Full-time".
    // The parser checks "full-time" before "internship", validating the
    // priority-order fix for known bug #2 in CLAUDE.md.
    expect(meta.jobType).toBe('Full-time');
  });

  test("locationType is 'Hybrid'", () => {
    // "Hybrid" appears in the header line.
    expect(meta.locationType).toBe('Hybrid');
  });

  test("location is 'Austin, TX'", () => {
    // No "Location:" prefix in this JD, so the fallback City, ST · pattern is used.
    expect(meta.location).toBe('Austin, TX');
  });

  test('yearsRequired is 3', () => {
    // "3+ years of professional experience" -- regex matches first digit before "years".
    expect(meta.yearsRequired).toBe(3);
  });

  test('all fields are null when text has no metadata signals', () => {
    // Validates that parseJobMeta() never throws and defaults all fields to null
    // (not undefined) when no location/jobType/years signals are present.
    const minimal = parseJobMeta('We are looking for a great developer.');
    expect(minimal.locationType).toBeNull();
    expect(minimal.jobType).toBeNull();
    expect(minimal.location).toBeNull();
    expect(minimal.yearsRequired).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseJobMeta() -- yearsRequired age-clause guards
// ---------------------------------------------------------------------------

describe('parseJobMeta() -- yearsRequired age-clause guards', () => {
  test('age boilerplate "Is at least 18 years of age" returns null', () => {
    // Regression guard: EEO legal boilerplate must never surface as job experience.
    const result = parseJobMeta('Is at least 18 years of age and authorized to work in the US.');
    expect(result.yearsRequired).toBeNull();
  });

  test('age boilerplate "Must be 21 years of age or older" returns null', () => {
    const result = parseJobMeta('Must be 21 years of age or older to apply.');
    expect(result.yearsRequired).toBeNull();
  });

  test('"3+ years of experience required" returns 3', () => {
    const result = parseJobMeta('3+ years of experience required in software development.');
    expect(result.yearsRequired).toBe(3);
  });

  test('"Minimum 5 years experience in software development" returns 5', () => {
    const result = parseJobMeta('Minimum 5 years experience in software development required.');
    expect(result.yearsRequired).toBe(5);
  });

  test('"10 years of experience preferred" returns 10', () => {
    const result = parseJobMeta('10 years of experience preferred with enterprise systems.');
    expect(result.yearsRequired).toBe(10);
  });

  test('"20 years of experience" returns null — N > 15 guard', () => {
    // No legitimate job posting requires more than 15 years.
    // This catches inflated numbers from non-experience prose.
    const result = parseJobMeta('Over 20 years of experience in the industry is a plus.');
    expect(result.yearsRequired).toBeNull();
  });

  test('age clause before experience clause extracts experience, not age', () => {
    // When a JD contains both an age clause and a real experience requirement,
    // the age clause must be skipped and the experience clause must win.
    const jd = [
      'Applicants must be at least 18 years of age.',
      'We require 4+ years of experience in data engineering.',
    ].join('\n');
    const result = parseJobMeta(jd);
    expect(result.yearsRequired).toBe(4);
  });
});
