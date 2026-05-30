/**
 * Unit tests for src/lib/registry.js
 *
 * Design notes for the team lead:
 *
 * - No mocks. Registry.js is pure data transformation over two JSON files, so
 *   we feed it the real data/skills.json and data/roles.json and assert on the
 *   output. That makes tests honest about what the live app will do.
 *
 * - Tests are grouped into describe blocks by function. This keeps failures easy
 *   to locate: "getAllSkillEntries > sort order" tells you exactly what broke.
 *
 * - Where the spec and the code disagree (matchRole 'Machine Learning Engineer')
 *   the test documents *actual* behavior and calls out the gap in a comment.
 *   We never write a test that we know will fail just to prove a wish list item.
 */

import { describe, test, expect } from 'vitest';
import {
  getAllSkillEntries,
  getSoftSkills,
  matchRole,
  listRoles,
  getVersion,
} from '../../src/lib/registry.js';

// ---------------------------------------------------------------------------
// getAllSkillEntries()
// ---------------------------------------------------------------------------

describe('getAllSkillEntries()', () => {
  test('returns a non-empty array', () => {
    const entries = getAllSkillEntries();
    // If this fails, skills.json is either empty or not being loaded at all.
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test('entries are sorted by alias length descending (longest first)', () => {
    const entries = getAllSkillEntries();

    // Check every consecutive pair, not just the first two. This catches a
    // partial sort bug that might leave the top correct but break midway.
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].alias.length).toBeGreaterThanOrEqual(
        entries[i + 1].alias.length,
        `Sort violated at index ${i}: "${entries[i].alias}" (len ${entries[i].alias.length}) ` +
          `followed by "${entries[i + 1].alias}" (len ${entries[i + 1].alias.length})`
      );
    }
  });

  test('every entry has the required shape: canonical, alias, category, guardWords', () => {
    const entries = getAllSkillEntries();

    // A structural check prevents silent regressions if the flatMap in
    // registry.js is ever changed to drop a field.
    for (const entry of entries) {
      expect(entry).toHaveProperty('canonical');
      expect(entry).toHaveProperty('alias');
      expect(entry).toHaveProperty('category');
      expect(entry).toHaveProperty('guardWords');
      expect(Array.isArray(entry.guardWords)).toBe(true);
    }
  });

  test('Spring Boot entry has a non-empty guardWords array', () => {
    const entries = getAllSkillEntries();

    // Spring Boot is the canonical example of a skill that needs guard words
    // because "spring" is a common English word.
    const springBootEntries = entries.filter(e => e.canonical === 'Spring Boot');

    // There should be at least one entry (one per pattern in skills.json).
    expect(springBootEntries.length).toBeGreaterThan(0);

    // Every one of its entries should share the same non-empty guardWords.
    for (const entry of springBootEntries) {
      expect(entry.guardWords.length).toBeGreaterThan(0);
    }

    // Spot-check the specific guard word called out in the project spec.
    expect(springBootEntries[0].guardWords).toContain('spring season');
  });

  test('skills with no guard words have an empty array, not null or undefined', () => {
    const entries = getAllSkillEntries();

    // Python has guardWords: [] in skills.json. This asserts that "no guard
    // words" is always an empty array so callers can safely call .includes()
    // without a null check.
    const pythonEntry = entries.find(e => e.canonical === 'Python');
    expect(pythonEntry).toBeDefined();
    expect(pythonEntry.guardWords).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getSoftSkills()
// ---------------------------------------------------------------------------

describe('getSoftSkills()', () => {
  test('returns a non-empty array', () => {
    const entries = getSoftSkills();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test('entries are sorted by alias length descending (longest first)', () => {
    const entries = getSoftSkills();
    for (let i = 0; i < entries.length - 1; i++) {
      expect(entries[i].alias.length).toBeGreaterThanOrEqual(
        entries[i + 1].alias.length,
        `Sort violated at index ${i}: "${entries[i].alias}" (len ${entries[i].alias.length}) ` +
          `followed by "${entries[i + 1].alias}" (len ${entries[i + 1].alias.length})`
      );
    }
  });

  test('every entry has canonical, alias, category, guardWords shape', () => {
    const entries = getSoftSkills();
    for (const entry of entries) {
      expect(entry).toHaveProperty('canonical');
      expect(entry).toHaveProperty('alias');
      expect(entry).toHaveProperty('category');
      expect(entry).toHaveProperty('guardWords');
      expect(Array.isArray(entry.guardWords)).toBe(true);
    }
  });

  test('no entry has a level property — soft skills are present/absent only', () => {
    // Regression guard: behavioral signals must never carry L1–L5 scoring fields.
    const entries = getSoftSkills();
    for (const entry of entries) {
      expect(entry).not.toHaveProperty('level');
    }
  });

  test('canonical names include Communication, Teamwork, and Leadership', () => {
    const entries = getSoftSkills();
    const canonicals = new Set(entries.map(e => e.canonical));
    expect(canonicals.has('Communication')).toBe(true);
    expect(canonicals.has('Teamwork')).toBe(true);
    expect(canonicals.has('Leadership')).toBe(true);
  });

  test('has at least 49 pattern entries (one per skill × patterns)', () => {
    // soft-skills.json has 49 terms each with 1–4 patterns; minimum is 49.
    const entries = getSoftSkills();
    expect(entries.length).toBeGreaterThanOrEqual(49);
  });
});

// ---------------------------------------------------------------------------
// matchRole()
// ---------------------------------------------------------------------------

describe('matchRole()', () => {
  test('exact label match "ML Engineer" returns a non-null result', () => {
    const result = matchRole('ML Engineer');
    expect(result).not.toBeNull();
  });

  test('returned object has role property containing "ml engineer" (lowercased label)', () => {
    const result = matchRole('ML Engineer');
    // The function normalizes to lowercase before storing.
    expect(result.role).toBe('ml engineer');
  });

  test('returned object has critical, required, and preferred arrays', () => {
    const result = matchRole('ML Engineer');
    expect(Array.isArray(result.critical)).toBe(true);
    expect(Array.isArray(result.required)).toBe(true);
    expect(Array.isArray(result.preferred)).toBe(true);
  });

  test('critical skills for ML Engineer include Python and Machine Learning', () => {
    const result = matchRole('ML Engineer');
    // These come from resolving skill IDs through skillsById in registry.js.
    // If the canonical names in skills.json change, this test will catch it.
    expect(result.critical).toContain('Python');
    expect(result.critical).toContain('Machine Learning');
  });

  test('"Senior ML Engineer" matches via substring (normalized includes label)', () => {
    // "senior ml engineer".includes("ml engineer") === true
    const result = matchRole('Senior ML Engineer');
    expect(result).not.toBeNull();
    expect(result.role).toBe('ml engineer');
  });

  test('"Machine Learning Engineer" does NOT match — known matchRole limitation', () => {
    // NOTE FOR REVIEWER: This is a deliberate documentation of current behavior,
    // not an assertion that the behavior is correct.
    //
    // The algorithm is:  normalized.includes(label) || label.includes(normalized)
    //   normalized = "machine learning engineer"
    //   label      = "ml engineer"
    // Neither string contains the other, so the function returns null.
    //
    // This is a gap: users typing "Machine Learning Engineer" get no role
    // template. The fix would be token/keyword matching or aliases in roles.json,
    // but that is a product decision — not a test fix.
    const result = matchRole('Machine Learning Engineer');
    expect(result).toBeNull();
  });

  test('completely unknown role string returns null', () => {
    const result = matchRole('totally unknown role xyz');
    expect(result).toBeNull();
  });

  test('null input returns null without throwing', () => {
    // Guards the early-return at the top of matchRole().
    expect(matchRole(null)).toBeNull();
  });

  test('empty string input returns null without throwing', () => {
    // An empty string is falsy, so it hits the same early-return guard.
    expect(matchRole('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listRoles()
// ---------------------------------------------------------------------------

describe('listRoles()', () => {
  test('returns a non-empty array', () => {
    const roles = listRoles();
    expect(Array.isArray(roles)).toBe(true);
    expect(roles.length).toBeGreaterThan(0);
  });

  test('has at least 10 roles (one per role in roles.json)', () => {
    const roles = listRoles();
    // roles.json currently defines exactly 10 roles. >= 10 gives one role of
    // slack if someone adds a new role, while still catching accidental deletions.
    expect(roles.length).toBeGreaterThanOrEqual(10);
  });

  test('every role entry has id, label, and tiers properties', () => {
    const roles = listRoles();
    for (const role of roles) {
      expect(role).toHaveProperty('id');
      expect(role).toHaveProperty('label');
      expect(role).toHaveProperty('tiers');
    }
  });

  test('tiers object has critical, required, and preferred arrays', () => {
    const roles = listRoles();
    for (const role of roles) {
      expect(Array.isArray(role.tiers.critical)).toBe(true);
      expect(Array.isArray(role.tiers.required)).toBe(true);
      expect(Array.isArray(role.tiers.preferred)).toBe(true);
    }
  });

  test('ml-engineer role exists in the list with correct label', () => {
    const roles = listRoles();
    const mlRole = roles.find(r => r.id === 'ml-engineer');
    expect(mlRole).toBeDefined();
    expect(mlRole.label).toBe('ML Engineer');
  });

  test('returns raw role data (skill IDs, not resolved canonical names)', () => {
    // listRoles() is a thin accessor — it hands back raw JSON, not the
    // resolved canonical names that matchRole() computes. This test
    // distinguishes the two functions' contracts clearly.
    const roles = listRoles();
    const mlRole = roles.find(r => r.id === 'ml-engineer');
    // The raw tiers contain skill IDs like "python", not "Python".
    expect(mlRole.tiers.critical).toContain('python');
    expect(mlRole.tiers.critical).not.toContain('Python');
  });
});

// ---------------------------------------------------------------------------
// getVersion()
// ---------------------------------------------------------------------------

describe('getVersion()', () => {
  test('returns an object with both skills and roles properties', () => {
    const version = getVersion();
    expect(version).toHaveProperty('skills');
    expect(version).toHaveProperty('roles');
  });

  test('both version values are strings', () => {
    const { skills, roles } = getVersion();
    expect(typeof skills).toBe('string');
    expect(typeof roles).toBe('string');
  });

  test('skills version matches "2026.2"', () => {
    // Pinning the exact version string catches accidental data file swaps or
    // forgotten version bumps after editing skills.json.
    const { skills } = getVersion();
    expect(skills).toBe('2026.2');
  });

  test('roles version matches "2026.1"', () => {
    const { roles } = getVersion();
    expect(roles).toBe('2026.1');
  });

  test('returns a softSkills property after soft-skills.json was wired in', () => {
    const version = getVersion();
    expect(version).toHaveProperty('softSkills');
    expect(typeof version.softSkills).toBe('string');
  });

  test('softSkills version matches "2026.1"', () => {
    const { softSkills } = getVersion();
    expect(softSkills).toBe('2026.1');
  });
});
