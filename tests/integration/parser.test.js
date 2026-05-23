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

describe('parseJobDescription() -- skill extraction from sample JD', () => {
  // Parse once and share across all tests in this describe block.
  // Re-parsing per test would be slower and would duplicate the call under test.
  const jdSkills = parseJobDescription(jdText);

  test('returns a non-empty array', () => {
    // Basic sanity. If this fails, nothing else in the describe block is meaningful.
    expect(Array.isArray(jdSkills)).toBe(true);
    expect(jdSkills.length).toBeGreaterThan(0);
  });

  test('extracts Python from the sample JD', () => {
    // Python appears in "Required Skills & Qualifications" as "Strong proficiency in Python".
    // A failure here means either the python pattern or the section detector broke.
    const names = jdSkills.map((s) => s.name);
    expect(names).toContain('Python');
  });

  test('extracts Machine Learning from the sample JD', () => {
    // "machine learning" appears in the job title, role description, and requirements.
    const names = jdSkills.map((s) => s.name);
    expect(names).toContain('Machine Learning');
  });

  test('extracts Docker from the sample JD', () => {
    // "Familiarity with Docker" -- detected even with lower proficiency inference.
    const names = jdSkills.map((s) => s.name);
    expect(names).toContain('Docker');
  });

  test('every extracted skill has shape: name, category, level (number), importance (number)', () => {
    // Structural regression guard. Catches shape changes in parseJobDescription().
    for (const skill of jdSkills) {
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('category');
      expect(typeof skill.level).toBe('number');
      expect(typeof skill.importance).toBe('number');
    }
  });

  test('Machine Learning has importance 5 (Critical) from the Required Skills section', () => {
    // "Required Skills & Qualifications" maps to section importance=5 (Critical).
    // Machine Learning is listed there, so the merged importance must be 5.
    const ml = jdSkills.find((s) => s.name === 'Machine Learning');
    expect(ml).toBeDefined();
    expect(ml.importance).toBe(5);
  });

  test('results are sorted by descending importance', () => {
    // parseJobDescription() contract: results ordered by importance desc, then level desc.
    for (let i = 0; i < jdSkills.length - 1; i++) {
      expect(jdSkills[i].importance).toBeGreaterThanOrEqual(jdSkills[i + 1].importance);
    }
  });
});

// ---------------------------------------------------------------------------
// parseJobDescription() -- guardWords regression
// ---------------------------------------------------------------------------

describe('parseJobDescription() -- guardWords suppress false positives', () => {
  test("does NOT extract Spring Boot when 'spring season' appears in the JD", () => {
    // The sample JD says "We love the spring season here in Austin."
    // Spring Boot's guardWords include "spring season". If guardWords logic breaks,
    // Spring Boot appears as a required skill in a JD that never mentions the framework.
    const jdSkills = parseJobDescription(jdText);
    expect(jdSkills.map((s) => s.name)).not.toContain('Spring Boot');
  });

  test("does NOT extract Spring Boot from a sentence containing only 'spring season'", () => {
    // Isolated synthetic text makes the guardWord assertion unambiguous.
    // This exercises the 150-char window checked around each candidate match.
    const synthetic = 'We love the spring season here and fresh ideas from the team.';
    const result = parseJobDescription(synthetic);
    expect(result.map((s) => s.name)).not.toContain('Spring Boot');
  });
});

// ---------------------------------------------------------------------------
// parseResumeText() -- fixture-based tests
// ---------------------------------------------------------------------------

describe('parseResumeText() -- skill extraction from sample resume', () => {
  // Parse once and share across all tests in this describe block.
  const resumeSkills = parseResumeText(resumeText);

  test('returns a non-empty array', () => {
    expect(Array.isArray(resumeSkills)).toBe(true);
    expect(resumeSkills.length).toBeGreaterThan(0);
  });

  test('every extracted skill has shape: name, category, level (number), source (string)', () => {
    // Resume skills carry a "source" field instead of "importance".
    // Different contract from JD skills -- test the shape explicitly.
    for (const skill of resumeSkills) {
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('category');
      expect(typeof skill.level).toBe('number');
      expect(skill).toHaveProperty('source');
    }
  });

  test('Python is level 3 -- Experience section wins over Technical Skills L2', () => {
    // Python appears in TECHNICAL SKILLS (L2 cap) AND PROFESSIONAL EXPERIENCE (L3 cap).
    // The merger keeps the highest level, so the final entry is L3.
    // This validates the highest-level-wins merge logic in parseResumeText().
    const python = resumeSkills.find((s) => s.name === 'Python');
    expect(python).toBeDefined();
    expect(python.level).toBe(3);
  });

  test('Machine Learning is level 3 sourced from Experience', () => {
    // PROFESSIONAL EXPERIENCE has title "Machine Learning Engineer Intern".
    // isTechRole() must approve the block and the ML pattern must match within it.
    const ml = resumeSkills.find((s) => s.name === 'Machine Learning');
    expect(ml).toBeDefined();
    expect(ml.level).toBe(3);
    expect(ml.source).toBe('Experience');
  });

  test('Docker is level 2 sourced from Projects', () => {
    // The PROJECTS section assigns a fixed L2 to all matched skills (project use
    // = practical exposure). Docker appears in "containerized data pipeline using Docker".
    const docker = resumeSkills.find((s) => s.name === 'Docker');
    expect(docker).toBeDefined();
    expect(docker.level).toBe(2);
    expect(docker.source).toBe('Projects');
  });

  test("React.js is level 1 -- 'learning' keyword triggers the cap in extractSkillsFromTechnicalSection", () => {
    // TECHNICAL SKILLS says "Currently learning React.js as a side hobby".
    // The function checks a 30-char context window for /learning|in progress|studying/
    // and assigns L1 if found (instead of the normal L2 for listed tech skills).
    // This test validates the learning-cap mechanism.
    const react = resumeSkills.find((s) => s.name === 'React');
    expect(react).toBeDefined();
    expect(react.level).toBe(1);
  });

  test('results are sorted by descending level', () => {
    // parseResumeText() returns skills sorted by descending level.
    for (let i = 0; i < resumeSkills.length - 1; i++) {
      expect(resumeSkills[i].level).toBeGreaterThanOrEqual(resumeSkills[i + 1].level);
    }
  });
});

// ---------------------------------------------------------------------------
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
