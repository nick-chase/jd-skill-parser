import fs from 'fs'
import path from 'path'

const FIXTURES_DIR = 'C:/Users/nikec/Desktop/nat20-core/offline_tests/resume-samples'
const { parseResume } = await import('../src/core/parser/parseResume.js')

const targets = ['sysengineer1.txt', 'systemanalyst1.txt']

for (const file of targets) {
  const text = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf-8')
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`FILE: ${file}`)
  const result = parseResume(text, file)
  const skills = result.technicalSignals ?? []
  console.log(`Skills detected: ${skills.length}`)
  for (const s of skills) {
    console.log(`  ${s.name} — L${s.level} — ${s.source}`)
  }
}
