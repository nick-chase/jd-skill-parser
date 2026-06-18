// gap.js — owns: runGapAnalysis, runBehavioralGap
// Moved from src/jd-skill-parser.jsx (pure functions, no React deps).

export function runGapAnalysis(jdSkills, resumeSkills) {
    if (!jdSkills || !resumeSkills) return null;

    const resumeMap = new Map(resumeSkills.map(s => [s.name, s]));

    const critical = [];    // In JD, not in resume
    const levelGaps = [];   // In resume but below required level
    const matched = [];     // In resume at or above required level
    const bonus = [];       // In resume, not in JD

    // Check each JD skill against resume
    for (const jdSkill of jdSkills) {
        const resumeSkill = resumeMap.get(jdSkill.name);
        if (!resumeSkill) {
            // Missing entirely
            critical.push({
                ...jdSkill,
                resumeLevel: 0,
                gap: jdSkill.level,
            });
        } else if (resumeSkill.level !== 'certified' && (resumeSkill.level < jdSkill.level || resumeSkill.level === 0)) {
            // Have it but below required level
            levelGaps.push({
                ...jdSkill,
                resumeLevel:   resumeSkill.level,
                gap:           jdSkill.level - resumeSkill.level,
                confidence:    resumeSkill.confidence    ?? null,
                source:        resumeSkill.source        ?? null,
                durationMonths: resumeSkill.durationMonths ?? null,
                contextCount:  resumeSkill.contextCount  ?? null,
            });
        } else {
            // Have it at or above required level (includes 'certified' — credential counts as met)
            matched.push({
                ...jdSkill,
                resumeLevel:   resumeSkill.level,
                gap:           0,
                confidence:    resumeSkill.confidence    ?? null,
                source:        resumeSkill.source        ?? null,
                durationMonths: resumeSkill.durationMonths ?? null,
                contextCount:  resumeSkill.contextCount  ?? null,
            });
        }
    }

    // Check resume skills not in JD
    const jdSkillNames = new Set(jdSkills.map(s => s.name));
    for (const resumeSkill of resumeSkills) {
        if (!jdSkillNames.has(resumeSkill.name)) {
            bonus.push(resumeSkill);
        }
    }

    // Sort critical by importance (most important first)
    critical.sort((a, b) => b.importance - a.importance);
    levelGaps.sort((a, b) => b.importance - a.importance);

    return { critical, levelGaps, matched, bonus };
}

export function runBehavioralGap(jdBehavioral, resumeBehavioral) {
    if (!jdBehavioral || !resumeBehavioral) return null;
    const resumeNames = new Set(resumeBehavioral.map(s => s.name));
    const matched = jdBehavioral.filter(s => resumeNames.has(s.name));
    const missing = jdBehavioral.filter(s => !resumeNames.has(s.name));
    return { matched, missing };
}
