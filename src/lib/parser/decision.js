/**
 * Decision engine — see docs/master-plan-v3.md Phase B.
 *
 * getDecision(jdProfile, resumeProfile)
 *   → { decision, rationale, actions, matchScore }
 *
 * Decisions (priority order applied internally):
 *   'redirect' — overall match < 25% with 5+ JD skills; role may be wrong category
 *   'build'    — one or more required/critical skills absent from resume
 *   'edits'    — all required skills present but some below required level
 *   'apply'    — all required skills met at or above required level
 *
 * "Required/critical" = JD skill with importance >= 4.
 */

const REQUIRED_IMPORTANCE = 4

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function computeGap(jdSkills, resumeSkills) {
  const resumeMap = new Map(resumeSkills.map(s => [s.name, s]))

  const missing  = []  // required JD skills absent from resume
  const gapped   = []  // required JD skills present but below required level
  const matched  = []  // JD skills in resume at or above required level (any importance)
  const allRequired = []

  for (const jd of jdSkills) {
    const resume = resumeMap.get(jd.name)
    const isRequired = jd.importance >= REQUIRED_IMPORTANCE

    if (!resume) {
      if (isRequired) missing.push(jd)
    } else if (resume.level < jd.level) {
      if (isRequired) gapped.push({ ...jd, resumeLevel: resume.level })
    } else {
      matched.push({ ...jd, resumeLevel: resume.level })
    }

    if (isRequired) allRequired.push(jd)
  }

  const total = jdSkills.length
  const matchScore = total === 0 ? 100 : Math.round((matched.length / total) * 100)

  return { missing, gapped, matched, allRequired, matchScore }
}

// ---------------------------------------------------------------------------
// Rationale + action generators
// ---------------------------------------------------------------------------

function applyContent(gap) {
  const rationale = gap.allRequired.length === 0
    ? 'No specific required skills were listed — your resume looks like a solid fit.'
    : `Your resume demonstrates the required level for all ${gap.allRequired.length} key skill${gap.allRequired.length !== 1 ? 's' : ''} in this job description.`

  const actions = [
    'Review the job duties section and tailor your cover letter to the top 2–3 responsibilities.',
    'Apply today — your profile meets the requirements.',
  ]
  if (gap.gapped.length > 0) {
    // Preferred-only gaps exist (no required gaps — just below-level on preferred skills)
    const skillName = gap.gapped[0].name
    actions.unshift(`Mentioning ${skillName} in your cover letter could strengthen your application.`)
  }

  return { rationale, actions: actions.slice(0, 3) }
}

function editsContent(gap) {
  const gappedNames = gap.gapped.map(s => s.name)
  const topGap = gap.gapped[0]

  const rationale = `You have ${gap.allRequired.length} required skill${gap.allRequired.length !== 1 ? 's' : ''} on your resume, but ${gap.gapped.length} ${gap.gapped.length !== 1 ? 'are' : 'is'} below the level this role expects. Strengthening the evidence for these skills could significantly improve your chances.`

  const actions = []

  for (const skill of gap.gapped.slice(0, 2)) {
    actions.push(
      `${skill.name}: add duration and a specific outcome — e.g., "Used ${skill.name} for 3 months to reduce processing time by 40%."`,
    )
  }

  if (actions.length < 3) {
    actions.push(
      `Move ${topGap.name} from your skills list into a project or role description to show real usage.`,
    )
  }

  return { rationale, actions: actions.slice(0, 3) }
}

function buildContent(gap) {
  const topMissing = gap.missing.slice(0, 3)

  const skillList = topMissing.map(s => s.name).join(', ')
  const rationale = `This role requires ${skillList} — ${gap.missing.length === 1 ? 'a skill that is' : 'skills that are'} not yet on your resume. Build evidence for ${gap.missing.length === 1 ? 'this skill' : 'these skills'} before applying.`

  const actions = []
  for (const skill of topMissing.slice(0, 2)) {
    actions.push(`${skill.name}: build a 1–2 month project and document it with a clear outcome.`)
  }
  if (actions.length < 3) {
    const next = topMissing[actions.length]
    if (next) {
      actions.push(`${next.name}: take a focused course and add the result to your Projects section.`)
    } else {
      actions.push('Once you have evidence for the missing skills, revisit this role and re-run the match.')
    }
  }

  return { rationale, actions: actions.slice(0, 3) }
}

function redirectContent(gap) {
  const topBonus = [] // resume skills not in JD — derive from caller if needed
  const rationale = `Your skills overlap with only ${gap.matchScore}% of what this role requires. You may be a stronger fit for a different role category — look for positions that center on your existing strengths.`

  const actions = [
    'Search for roles that closely match your strongest skills rather than stretching for this one.',
    `Build evidence for ${gap.missing[0]?.name ?? 'the top missing skill'} if you want to pursue this role type in the future.`,
    'Re-run the match after you have added 1–2 more projects to your resume.',
  ]

  return { rationale, actions: actions.slice(0, 3) }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Determines the right next action for a candidate given a JD and resume.
 *
 * @param {object} jdProfile     - Output of parseJobDescription()
 * @param {object} resumeProfile - Output of parseResumeText()
 * @returns {{ decision: string, rationale: string, actions: string[], matchScore: number }}
 */
export function getDecision(jdProfile, resumeProfile) {
  const jdSkills     = jdProfile?.technicalSignals     ?? []
  const resumeSkills = resumeProfile?.technicalSignals ?? []

  const gap = computeGap(jdSkills, resumeSkills)

  let decision
  let content

  // Priority: redirect → build → edits → apply
  if (jdSkills.length >= 5 && gap.matchScore < 25) {
    decision = 'redirect'
    content  = redirectContent(gap)
  } else if (gap.missing.length > 0) {
    decision = 'build'
    content  = buildContent(gap)
  } else if (gap.gapped.length > 0) {
    decision = 'edits'
    content  = editsContent(gap)
  } else {
    decision = 'apply'
    content  = applyContent(gap)
  }

  return {
    decision,
    rationale:  content.rationale,
    actions:    content.actions,
    matchScore: gap.matchScore,
  }
}
