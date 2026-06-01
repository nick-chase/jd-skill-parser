/**
 * Coverage Gap Report generator.
 *
 * Scans every JD in jd_test_bank/ for tech-looking terms that NO pattern in
 * data/skills.json covers. Terms are ranked by how many distinct JDs mention
 * them, so the highest-value additions float to the top.
 *
 * Run with:  npm run test:coverage-gaps
 * Output:    tests/coverage-gaps.md  (gitignored)
 *
 * How coverage is checked:
 *   Each candidate term is tested against every compiled pattern in skills.json.
 *   This correctly handles alias patterns — e.g., "LLM" is covered because
 *   data/skills.json has \\bLLM\\b even if the specific JD phrasing triggers a
 *   different canonical name ("Large Language Models").
 */

import { test } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const JD_DIR    = resolve(__dirname, '../jd_test_bank')
const OUT_FILE  = resolve(__dirname, '../tests/coverage-gaps.md')

const JD_FILES = [
  'job_desc_1 .txt',
  'job_desc_2.txt',
  'job_desc_3.txt',
  'job_desc_4.txt',
  'job_desc_5.txt',
  'job_desc_6.txt',
  'job_desc_7.txt',
  'job_desc_8.txt',
  'job_desc_9.txt',
  'job_desc_10.txt',
]

// Common non-technical words to reject. All lookups are lowercased.
const STOPWORDS = new Set([
  // English function words
  'the','and','for','with','you','our','are','not','have','will','this','that',
  'can','all','your','from','but','has','an','be','or','by','we','as','at',
  'it','on','in','is','of','to','us','my','he','she','they','their','there',
  'these','those','more','most','also','both','each','few','such','than',
  'into','out','new','use','how','any','may','was','were','been','its','per',
  'via','etc','i.e','e.g','no','so','do','if','up','off','ask',
  // Common HR / job-posting words
  'role','team','work','year','years','experience','skills','ability','strong',
  'good','great','high','large','small','key','core','main','job','position',
  'company','business','product','service','project','degree','bachelor',
  'master','required','preferred','must','should','including','well','provide',
  'support','ensure','manage','develop','build','design','create','implement',
  'maintain','deliver','apply','join','grow','lead','help','drive','own','day',
  'make','time','need','want','base','based','best','full','part','senior',
  'junior','entry','level','staff','principal','manager','engineer','developer',
  'analyst','scientist','consultant','architect','intern','associate',
  'specialist','coordinator','director','head','note','one','forward','equal',
  'employer','housing','zero','two','three','four','five','six','cross',
  'please','contact','click','here','learn','see','find','view','read','visit',
  // Geographic / company noise
  'nj','ny','ca','tx','il','wa','us','usa','uk','inc','llc','ltd','corp','co',
  // HR / legal abbreviations
  'eeo','pto','fmla','ada','flsa','osha','nlrb','erisa','cobra',
  // Business abbreviations
  'hr','kpi','roi','ceo','cto','cfo','coo','vp','svp','md','phd','mba',
  'poc','sme','rfi','rfp','sow','nda','brd','prd',
  // Company/brand names in the test bank
  'pny','tcs','ibm','deloitte','linkedin','aptask','hirep ower','decisione',
  'dataannotation','recruiterpc','aptask','msshift','phibro',
  // Job board artifacts
  'beta','apply','save','share','premium','promoted','hirer','reposted',
  // Calendar
  'jan','feb','mar','apr','jun','jul','aug','sep','oct','nov','dec',
  'mon','tue','wed','thu','fri','sat','sun',
  // Standalone parts of compound tech terms already in skills.json
  'cd','ci','ws','ad',
  // Generic role/department words (not skills)
  'swe','career','city','science','computer','strongly','sea','atm','usd',
  // Government / regulatory agencies
  'dod','dol','sec','occ','fdic',
  // Noise from specific JDs
  'atr','esd','ats','lg','id',
])

// Patterns that identify noise: URLs, salary strings, numeric codes, paths
const NOISE_PATTERNS = [
  /https?:\/\//i,
  /\.(com|org|net|gov|edu|html|htm|php|asp|pdf|xml|json)\b/i,
  /^www\./i,            // www.anything
  /\/[a-z]/i,           // URL path segments
  /\d{2,}\.\d{2}/,      // salary / version numbers like 000.00 or 3.73
  /^\d+$/,              // pure numbers
  /[<>{}]/,             // HTML artifacts
  /^[A-Z]\d+$/,         // codes like J0526
]

function isNoise(term) {
  return NOISE_PATTERNS.some(rx => rx.test(term))
}

/**
 * Build a function that checks whether a term string is already covered by
 * any pattern in skills.json. This is more accurate than comparing against
 * the parser's output for the specific JD because it catches aliases that
 * map to the same canonical name (e.g. "LLM" → "Large Language Models").
 */
function buildCoverageChecker(skillsData) {
  const compiled = []
  for (const skill of skillsData.skills) {
    for (const pat of skill.patterns) {
      try {
        const isRegex = pat.includes('\\b') || pat.includes('(?')
        const rx = isRegex
          ? new RegExp(pat, 'i')
          : new RegExp(`\\b${pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        compiled.push(rx)
      } catch { /* ignore malformed patterns */ }
    }
  }
  return (term) => compiled.some(rx => rx.test(term))
}

/**
 * Extract tech-looking candidate terms from raw JD text.
 * Returns a Set of original-case strings.
 */
function extractCandidates(text) {
  const candidates = new Set()

  // 1. CamelCase / PascalCase (NoSQL, DevSecOps, GraphQL, OpenID, ChatGPT)
  for (const m of text.matchAll(/\b[A-Z][a-z]+(?:[A-Z][a-zA-Z0-9]+)+\b/g)) {
    candidates.add(m[0])
  }

  // 2. ALL-CAPS abbreviations 2–8 alpha/digit chars (SQL, SDLC, CI, QA, CMMI)
  for (const m of text.matchAll(/\b[A-Z][A-Z0-9]{1,7}\b/g)) {
    if (m[0].length >= 2) candidates.add(m[0])
  }

  // 3. Dot-notation identifiers (React.js, Node.js, .NET)
  for (const m of text.matchAll(/\.?[A-Za-z]\w*\.\w{1,5}\b/g)) {
    if (m[0].length >= 4 && !m[0].match(/^\d/)) candidates.add(m[0])
  }

  // 4. Slash-compound tech terms (CI/CD, B2B) — alpha on both sides
  for (const m of text.matchAll(/\b[A-Za-z]{2,}\/[A-Za-z]{2,}\b/g)) {
    candidates.add(m[0])
  }

  return candidates
}

const today = () => new Date().toISOString().split('T')[0]

test('generate coverage gap report', () => {
  // Load skills.json directly for pattern-level coverage checking
  const skillsData = JSON.parse(
    readFileSync(resolve(__dirname, '../../nat20-core/data/skills.json'), 'utf-8')
  )
  const isCovered = buildCoverageChecker(skillsData)

  // term → Set of JD indices (1-based) where it appears and is not covered
  const termMap = new Map()

  for (let i = 0; i < JD_FILES.length; i++) {
    const filename = JD_FILES[i]
    let text
    try {
      text = readFileSync(resolve(JD_DIR, filename), 'utf-8')
    } catch {
      console.warn(`  [skip] ${filename} — file not found`)
      continue
    }

    for (const term of extractCandidates(text)) {
      const key = term.toLowerCase()
      if (STOPWORDS.has(key)) continue
      if (key.length < 2) continue
      if (isNoise(term)) continue
      if (isCovered(term)) continue   // already in skills.json

      if (!termMap.has(term)) termMap.set(term, new Set())
      termMap.get(term).add(i + 1)
    }
  }

  // Sort: most JDs first, then alphabetically
  const sorted = [...termMap.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))

  // Build markdown
  let md = `# Coverage Gap Report\n_Generated: ${today()}_\n\n`
  md += `> Terms found in the JD test bank that are **not covered** by any pattern in \`data/skills.json\`.\n`
  md += `> Sorted by number of JDs mentioning the term — add high-frequency items first.\n\n`

  if (sorted.length === 0) {
    md += '_No unmatched terms found — excellent coverage!_\n'
  } else {
    md += `| Term | JDs | # JDs |\n`
    md += `|------|-----|-------|\n`
    for (const [term, jdSet] of sorted) {
      const jdList = [...jdSet].sort((a, b) => a - b).join(', ')
      md += `| \`${term}\` | ${jdList} | ${jdSet.size} |\n`
    }
  }

  mkdirSync(resolve(__dirname, '../tests'), { recursive: true })
  writeFileSync(OUT_FILE, md, 'utf-8')
  console.log(`\nGap report → tests/coverage-gaps.md  (${sorted.length} unmatched terms)`)
})
