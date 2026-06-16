/**
 * validate-fixtures.js
 *
 * Reads every {name}.answers.json in tests/fixtures/resumes/,
 * runs the resume text through parseResume(), and compares parser output
 * against the hand-labeled answer keys.
 *
 * Gate metric: (exact + adjacent) / total >= 85%
 *
 * Usage:  node scripts/validate-fixtures.js
 *         npm run validate:fixtures
 *
 * Exit 0 = gate passes
 * Exit 1 = gate fails or a fixture file is missing
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseResume } from '../src/core/parser/parseResume.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'tests', 'fixtures', 'resumes');
const GATE = 0.85;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFixtures() {
  const entries = readdirSync(FIXTURES_DIR);
  const answerFiles = entries.filter(f => f.endsWith('.answers.json'));
  return answerFiles.map(f => {
    const name = f.replace('.answers.json', '');
    const answersPath = join(FIXTURES_DIR, f);
    const resumePath  = join(FIXTURES_DIR, `${name}.txt`);
    return { name, answersPath, resumePath };
  });
}

function compare(parserLevel, answerEntry) {
  const { level, minLevel, maxLevel } = answerEntry;

  // Certified skills: exact match only
  if (level === 'certified') {
    return parserLevel === 'certified' ? 'exact' : 'fail';
  }

  // Numeric levels
  const parsed = typeof parserLevel === 'number' ? parserLevel : parseInt(parserLevel, 10);
  if (isNaN(parsed)) return 'fail';

  if (parsed === level)                          return 'exact';
  if (parsed >= minLevel && parsed <= maxLevel)  return 'adjacent';
  return 'fail';
}

// ---------------------------------------------------------------------------
// Per-fixture validation
// ---------------------------------------------------------------------------

function validateFixture({ name, answersPath, resumePath }) {
  const answers = JSON.parse(readFileSync(answersPath, 'utf-8'));

  if (!existsSync(resumePath)) {
    console.error(`  [MISSING] ${name}.txt — resume text file not found. Skipping.`);
    return null;
  }

  const text   = readFileSync(resumePath, 'utf-8');
  const result = parseResume(text);

  // Build a lookup map from parser output: canonical name → level
  const parserSkillMap = new Map(
    result.technicalSignals.map(s => [s.name, s.level])
  );

  const skillResults = [];
  let exact = 0, adjacent = 0, fail = 0;

  for (const [skillName, answerEntry] of Object.entries(answers.skills || {})) {
    const parserLevel = parserSkillMap.has(skillName)
      ? parserSkillMap.get(skillName)
      : 'missing';

    let verdict;
    if (parserLevel === 'missing') {
      verdict = 'fail';
      fail++;
    } else {
      verdict = compare(parserLevel, answerEntry);
      if (verdict === 'exact')    exact++;
      else if (verdict === 'adjacent') adjacent++;
      else fail++;
    }

    skillResults.push({
      skill: skillName,
      expected: answerEntry.level,
      band: `${answerEntry.minLevel}–${answerEntry.maxLevel}`,
      actual: parserLevel,
      verdict,
    });
  }

  // Behavioral check (presence only)
  const parserBehavioral = new Set(
    (result.behavioralSignals || []).map(s => s.canonical ?? s.name ?? s)
  );
  const behavioralMissing = (answers.behavioral || []).filter(b => !parserBehavioral.has(b));
  const behavioralPresent = (answers.behavioral || []).filter(b =>  parserBehavioral.has(b));

  // Degree check
  let degreeMatch = null;
  if (answers.degree) {
    const pd = result.degree;
    const expectedStatus = answers.degree.status;
    const parserStatus = pd
      ? (pd.inProgress ? 'in_progress' : (pd.expected ? 'expected' : 'completed'))
      : null;

    degreeMatch = {
      expectedLevel:  answers.degree.degreeLevel,
      actualLevel:    pd ? pd.degreeLevel : null,
      expectedStatus,
      actualStatus:   parserStatus,
      levelMatch:  pd ? pd.degreeLevel === answers.degree.degreeLevel : false,
      statusMatch: parserStatus === expectedStatus,
    };
  }

  const total = exact + adjacent + fail;
  const pct   = total > 0 ? ((exact + adjacent) / total) : 0;

  return {
    name,
    audience: answers.meta?.audience ?? 'unknown',
    notes:    answers.meta?.notes    ?? '',
    skillResults,
    exact, adjacent, fail, total,
    pct,
    behavioralPresent,
    behavioralMissing,
    degreeMatch,
    passes: pct >= GATE,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printFixtureReport(r) {
  const badge = r.passes ? 'PASS' : 'FAIL';
  const pctStr = `${(r.pct * 100).toFixed(1)}%`;

  console.log(`\n[${badge}] ${r.name}  (${r.audience})  exact+adjacent=${pctStr}`);
  if (r.notes) console.log(`       ${r.notes}`);

  // Skill table
  const colW = [22, 8, 8, 8, 8];
  const header = [
    'Skill'.padEnd(colW[0]),
    'Expected'.padEnd(colW[1]),
    'Band'.padEnd(colW[2]),
    'Actual'.padEnd(colW[3]),
    'Verdict'.padEnd(colW[4]),
  ].join('  ');
  console.log(`\n  ${header}`);
  console.log(`  ${'-'.repeat(header.length)}`);

  for (const row of r.skillResults) {
    const verdictMark = row.verdict === 'exact' ? 'exact   '
      : row.verdict === 'adjacent' ? 'adjacent'
      : 'FAIL    ';
    const line = [
      row.skill.padEnd(colW[0]),
      String(row.expected).padEnd(colW[1]),
      row.band.padEnd(colW[2]),
      String(row.actual).padEnd(colW[3]),
      verdictMark,
    ].join('  ');
    console.log(`  ${line}`);
  }

  // Behavioral
  if (r.behavioralPresent.length > 0 || r.behavioralMissing.length > 0) {
    console.log(`\n  Behavioral — present: [${r.behavioralPresent.join(', ')}]`);
    if (r.behavioralMissing.length > 0) {
      console.log(`  Behavioral — MISSING: [${r.behavioralMissing.join(', ')}]`);
    }
  }

  // Degree
  if (r.degreeMatch) {
    const dm = r.degreeMatch;
    const lvlStr = dm.levelMatch ? 'level OK' : `level expected ${dm.expectedLevel} got ${dm.actualLevel}`;
    const stStr  = dm.statusMatch ? 'status OK' : `status expected ${dm.expectedStatus} got ${dm.actualStatus}`;
    console.log(`\n  Degree — ${lvlStr}  |  ${stStr}`);
  }

  console.log(`\n  Skills: ${r.exact} exact, ${r.adjacent} adjacent, ${r.fail} fail / ${r.total} total  (${pctStr})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const fixtures = loadFixtures();

  if (fixtures.length === 0) {
    console.log('No fixture answer files found in tests/fixtures/resumes/. Nothing to validate.');
    process.exit(0);
  }

  console.log(`\nNat20 Fixture Validator — ${fixtures.length} fixture(s) found`);
  console.log(`Gate: exact+adjacent >= ${(GATE * 100).toFixed(0)}%\n`);

  const results = fixtures
    .map(f => validateFixture(f))
    .filter(Boolean);

  results.forEach(printFixtureReport);

  // Overall summary
  const totalExact    = results.reduce((s, r) => s + r.exact,    0);
  const totalAdjacent = results.reduce((s, r) => s + r.adjacent, 0);
  const totalFail     = results.reduce((s, r) => s + r.fail,     0);
  const totalSkills   = results.reduce((s, r) => s + r.total,    0);
  const overallPct    = totalSkills > 0 ? (totalExact + totalAdjacent) / totalSkills : 0;
  const fixturesPassed = results.filter(r => r.passes).length;

  console.log('\n' + '='.repeat(60));
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Fixtures:  ${fixturesPassed} / ${results.length} pass`);
  console.log(`Skills:    ${totalExact} exact  ${totalAdjacent} adjacent  ${totalFail} fail  /  ${totalSkills} total`);
  console.log(`Gate metric (exact+adjacent):  ${(overallPct * 100).toFixed(1)}%  (threshold: ${(GATE * 100).toFixed(0)}%)`);

  if (overallPct >= GATE) {
    console.log('\nRESULT: PASS — gate satisfied.');
    process.exit(0);
  } else {
    console.log('\nRESULT: FAIL — gate not satisfied.');
    process.exit(1);
  }
}

main();
