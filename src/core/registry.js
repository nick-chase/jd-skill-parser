import skillsData from '../../data/skills.json' with { type: 'json' };
import rolesData from '../../data/roles.json' with { type: 'json' };
import softSkillsData from '../../data/soft-skills.json' with { type: 'json' };

const skillsById = new Map(skillsData.skills.map(s => [s.id, s]));
const rolesById  = new Map(rolesData.roles.map(r => [r.id, r]));

// Flat list of { canonical, alias, category, guardWords } — one entry per pattern.
// Pre-sorted longest pattern first to prevent substring collisions (mirrors parser behavior).
const _entries = skillsData.skills
    .flatMap(skill =>
        skill.patterns.map(pat => ({
            canonical:  skill.canonical,
            alias:      pat,
            category:   skill.category,
            guardWords: skill.guardWords,
        }))
    )
    .sort((a, b) => b.alias.length - a.alias.length);

const _softSkillEntries = softSkillsData.softSkills
    .flatMap(skill =>
        skill.patterns.map(pat => ({
            canonical:  skill.canonical,
            alias:      pat,
            category:   skill.category,
            guardWords: skill.guardWords,
        }))
    )
    .sort((a, b) => b.alias.length - a.alias.length);

export function getAllSkillEntries() {
    return _entries;
}

export function getSoftSkills() {
    return _softSkillEntries;
}

// Fuzzy-match a job role string and return the template with canonical skill names.
// Mirrors the logic of the former matchRoleTemplate() in jd-skill-parser.jsx.
export function matchRole(jobRoleString) {
    if (!jobRoleString) return null;
    const normalized = jobRoleString.toLowerCase();
    for (const role of rolesData.roles) {
        const label = role.label.toLowerCase();
        if (normalized.includes(label) || label.includes(normalized)) {
            return {
                role:      label,
                critical:  role.tiers.critical.map(id => skillsById.get(id)?.canonical ?? id),
                required:  role.tiers.required.map(id => skillsById.get(id)?.canonical ?? id),
                preferred: role.tiers.preferred.map(id => skillsById.get(id)?.canonical ?? id),
            };
        }
    }
    return null;
}

export function listRoles() {
    return rolesData.roles;
}

export function getVersion() {
    return { skills: skillsData.version, roles: rolesData.version, softSkills: softSkillsData.version };
}
