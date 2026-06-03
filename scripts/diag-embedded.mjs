import * as registry from '../src/core/registry.js'

const entries = registry.getAllSkillEntries()

function matchLine(line) {
  const hits = []
  for (const { canonical, alias } of entries) {
    const isRegex = alias.includes('\\b') || alias.includes('(?')
    let pat
    try {
      pat = isRegex
        ? new RegExp(alias, 'gi')
        : new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    } catch { continue }
    if (pat.test(line)) hits.push(canonical)
  }
  return hits
}

const lines = [
  'Embedded Software Engineer',
  'Designed and built APIs that increased application processing rate by 55%',
  'Lead project to increase application scale from 5 million to 15 million users',
  'C++ proficiency',
  'Open source technology',
  'Software optimization',
  'Bachelor degree in software engineering',
  'Debugs software with 95% accuracy to reduce system failures',
  'Increases product efficiency and accuracy by 45% through coding',
  'Collaborates with coding engineering and development specialists',
  'monitors project progression',
  'Formulates software requirements',
]

for (const line of lines) {
  const hits = matchLine(line)
  console.log(`"${line.slice(0, 65)}"`)
  console.log(`  => ${hits.length ? hits.join(', ') : 'NO MATCH'}\n`)
}

// Also check which section "embedded" lands in
import { parseResume } from '../src/core/parser/parseResume.js'
import fs from 'fs'
const text = fs.readFileSync(
  'C:/Users/nikec/Desktop/nat20-core/offline_tests/resume-samples/embeddedsoftwareengineer.txt',
  'utf-8'
)

// Check what sections are extracted
const summaryMatch = text.match(/Summary[\s\S]*?(?=Education)/i)
console.log('=== SUMMARY SECTION ===')
console.log(summaryMatch?.[0]?.trim().slice(0, 200) ?? 'not found')

const skillsMatch = text.match(/Skills[\s\S]*$/i)
console.log('\n=== SKILLS SECTION ===')
console.log(skillsMatch?.[0]?.trim().slice(0, 200) ?? 'not found')
