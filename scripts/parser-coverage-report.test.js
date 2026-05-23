/**
 * Parser Coverage Report generator.
 *
 * Runs the parser against every JD in jd_test_bank/ and writes a Markdown
 * report to reports/parser-coverage-report.md showing what was extracted.
 * Use this to identify dictionary gaps and guide future skill-pattern fixes.
 *
 * Run with:  npm run report
 * Output:    reports/parser-coverage-report.md  (gitignored)
 */

import { test } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { parseJobDescription, parseJobMeta } from '../src/jd-skill-parser.jsx'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const JD_DIR    = resolve(__dirname, '../jd_test_bank')
const OUT_DIR   = resolve(__dirname, '../reports')
const OUT_FILE  = resolve(OUT_DIR, 'parser-coverage-report.md')

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

const val = (v) => (v !== null && v !== undefined ? String(v) : '—')
const today = () => new Date().toISOString().split('T')[0]

test('generate parser coverage report', () => {
  const results = JD_FILES.map((filename, i) => {
    const text   = readFileSync(resolve(JD_DIR, filename), 'utf-8')
    const skills = parseJobDescription(text)
    const meta   = parseJobMeta(text)
    return { index: i + 1, filename, skills, meta }
  })

  const gaps = results.filter((r) => r.skills.length < 3)

  // ---- Build Markdown -------------------------------------------------------

  let md = `# Parser Coverage Report\n_Generated: ${today()}_\n\n`

  // Summary table
  md += `## Summary\n\n`
  md += `| # | File | Job Type | Loc Type | Location | Skills |\n`
  md += `|---|------|----------|----------|----------|--------|\n`
  for (const { index, filename, skills, meta } of results) {
    const flag = skills.length < 3 ? ' ⚠' : ''
    md += `| ${index} | \`${filename}\` | ${val(meta.jobType)} | ${val(meta.locationType)} | ${val(meta.location)} | ${skills.length}${flag} |\n`
  }
  md += '\n'

  // Coverage gaps callout
  if (gaps.length > 0) {
    md += `## Coverage Gaps\n\n`
    md += `The following JDs returned fewer than 3 skills. Their domains are likely not yet covered by \`data/skills.json\`:\n\n`
    for (const { filename, skills } of gaps) {
      md += `- \`${filename}\` — **${skills.length}** skill${skills.length === 1 ? '' : 's'} detected\n`
    }
    md += '\n'
  }

  md += '---\n\n'

  // Per-JD detail sections
  for (const { index, filename, skills, meta } of results) {
    md += `## JD ${index} — \`${filename}\`\n\n`
    md += `**Job Type:** ${val(meta.jobType)} &nbsp;|&nbsp; `
    md += `**Loc Type:** ${val(meta.locationType)} &nbsp;|&nbsp; `
    md += `**Location:** ${val(meta.location)} &nbsp;|&nbsp; `
    md += `**Years Required:** ${val(meta.yearsRequired)}\n\n`

    if (skills.length === 0) {
      md += `> ⚠ **No skills parsed.** This JD's domain has no matching entries in the skill dictionary.\n`
      md += `> Review the JD text and add the missing skill patterns to \`data/skills.json\`.\n\n`
    } else {
      md += `### Skills Parsed (${skills.length})\n\n`
      md += `| Skill | Category | Level | Importance |\n`
      md += `|-------|----------|:-----:|:----------:|\n`
      for (const s of skills) {
        md += `| ${s.name} | ${s.category} | ${s.level} | ${s.importance} |\n`
      }
      md += '\n'
    }

    md += '---\n\n'
  }

  // Write output
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, md, 'utf-8')
  console.log(`\nReport written → reports/parser-coverage-report.md`)
})
