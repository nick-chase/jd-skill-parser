import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FIXTURES_DIR = 'C:/Users/nikec/Desktop/nat20-core/offline_tests/resume-samples'

// Try both possible import paths
let parseResume
try {
  const mod = await import('../src/core/parser/parseResume.js')
  parseResume = mod.parseResume ?? mod.default
} catch {
  const mod = await import('../src/core/registry.js')
  parseResume = mod.parseResume ?? mod.default
}

const files = fs.readdirSync(FIXTURES_DIR)
  .filter(f => f.endsWith('.txt'))
  .sort()

console.log(`Found ${files.length} resume files\n`)

let totalSkills = 0
let totalMisclassified = 0
let totalNoSkills = 0
const undetectedByRole = []

for (const file of files) {
  const text = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf-8')
  let result
  try {
    result = parseResume(text)
  } catch (err) {
    console.log(`══════════════════════════════════`)
    console.log(`FILE: ${file}`)
    console.log(`❌ PARSE ERROR: ${err.message}`)
    continue
  }

  const skills = result.technicalSignals ?? []
  const softSkills = result.behavioralSignals ?? []
  const misclassified = skills.filter(s =>
    s.source === 'Projects' || s.source === 'Technical Skills'
  )

  console.log(`══════════════════════════════════`)
  console.log(`FILE: ${file}`)
  console.log(`Skills detected: ${skills.length}`)

  if (skills.length === 0) {
    console.log(`  ⚠️  NO SKILLS DETECTED`)
    totalNoSkills++
    undetectedByRole.push(file)
  } else {
    for (const skill of skills) {
      const level = skill.level ?? skill.proficiencyLevel ?? '?'
      const evidence = skill.evidenceType ?? skill.source ?? '?'
      const duration = skill.durationMonths ? `${skill.durationMonths}mo` : 'unknown duration'
      const flag = (evidence === 'project' || evidence === 'skills-only') ? ' ⚠️' : ''
      console.log(`  ${skill.name} — L${level} — ${evidence} (${duration})${flag}`)
    }
  }

  console.log(`Behavioral: ${softSkills.length > 0 ? softSkills.map(s => s.name ?? s).join(', ') : 'none'}`)
  if (misclassified.length > 0) {
    console.log(`⚠️  ${misclassified.length} skill(s) possibly misclassified`)
    totalMisclassified++
  }
  console.log('')

  totalSkills += skills.length
}

console.log(`══════════════════════════════════`)
console.log(`SUMMARY`)
console.log(`Total resumes: ${files.length}`)
console.log(`Total skills detected: ${totalSkills}`)
console.log(`Avg skills per resume: ${(totalSkills / files.length).toFixed(1)}`)
console.log(`Resumes with 0 skills: ${totalNoSkills}`)
console.log(`Resumes with misclassified evidence: ${totalMisclassified}`)
if (undetectedByRole.length > 0) {
  console.log(`Files with no skills: ${undetectedByRole.join(', ')}`)
}
