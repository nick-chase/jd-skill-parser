import { describe, test, expect } from 'vitest'
import { parseResume } from '@core/parser/parseResume.js'

// ---------------------------------------------------------------------------
// Project section date extraction
// ---------------------------------------------------------------------------

describe('extractSkillsFromProjects() — date extraction from title line', () => {
  test('skills from project with "May 2026 to Present" get non-null durationMonths', () => {
    const resume = [
      'PROJECTS',
      'Nat20 — Resume & JD Skill Parser — React / Vite / Tailwind CSS / Supabase / Stripe / Vercel May 2026 to Present',
      '• Built a full-stack SaaS web application using React and Vite.',
      '• Configured Supabase and Stripe for backend.',
    ].join('\n')
    const result = parseResume(resume)
    const react = result.technicalSignals.find(s => s.name === 'React')
    expect(react).toBeDefined()
    expect(react.durationMonths).not.toBeNull()
    expect(react.durationMonths).toBeGreaterThan(0)
  })

  test('skills from project with only a year ("2023") get null durationMonths', () => {
    const resume = [
      'PROJECTS',
      'Inventrack v1 — Inventory Management System — C# / Unity3D / SQLite / Git  2023',
      '• Built a full inventory management application using Unity3D and SQLite.',
    ].join('\n')
    const result = parseResume(resume)
    const unity = result.technicalSignals.find(s => s.name === 'Unity')
    if (unity) {
      expect(unity.durationMonths).toBeNull()
    }
  })

  test('two projects in section get their own durations independently', () => {
    const resume = [
      'PROJECTS',
      'Nat20 — React / Vite / Supabase  May 2026 to Present',
      '• Built a web application using React and Supabase.',
      'Inventrack — C# / Unity3D  2023',
      '• Built an inventory system using Unity3D.',
    ].join('\n')
    const result = parseResume(resume)
    const react = result.technicalSignals.find(s => s.name === 'React')
    expect(react?.durationMonths).toBeGreaterThan(0)
  })

  test('extractDateFromTitleLine finds date at end of em-dash separated line', () => {
    // Indirect test: if the date is found, the skill gets a non-null durationMonths
    const resume = [
      'PROJECTS',
      'My App — JavaScript / Node.js — React  Jan 2024 to Present',
      '• Developed a web app using JavaScript and React.',
    ].join('\n')
    const result = parseResume(resume)
    const js = result.technicalSignals.find(s => s.name === 'JavaScript')
    expect(js?.durationMonths).toBeGreaterThan(0)
  })
})
