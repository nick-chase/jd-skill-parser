import { useState, useEffect } from 'react'
import { loadResumeProfile } from '../lib/supabase.js'
import StatBlock from '../components/StatBlock.jsx'

// Derive a "class" from the strongest skill category (L3+ skills only)
function deriveClass(skills) {
  if (!skills?.length) return 'Adventurer'

  const counts = {}
  skills.forEach(s => {
    if ((s.level ?? 0) >= 3) {
      counts[s.category] = (counts[s.category] ?? 0) + 1
    }
  })

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const classMap = {
    'Programming Language': 'Software Engineer',
    'ML / AI':              'ML Engineer',
    'Cloud / Infra':        'DevOps Engineer',
    'Database':             'Data Engineer',
    'Framework':            'Full-Stack Engineer',
    'Dev Tool':             'Engineering Generalist',
  }

  return classMap[top] ?? 'Software Engineer'
}

export default function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    loadResumeProfile(user.id).then(data => {
      setProfile(data)
      setLoading(false)
    })
  }, [user])

  if (!user) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="text-2xl mb-2">⚔️</div>
        <div className="font-medium">Sign in to view your character sheet</div>
        <div className="text-sm mt-1">Your skill profile is saved when you parse your resume</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        Loading your profile...
      </div>
    )
  }

  if (!profile?.parsed_skills?.length) {
    return (
      <div className="text-center py-16 text-slate-500">
        <div className="text-2xl mb-2">📜</div>
        <div className="font-medium">No character sheet yet</div>
        <div className="text-sm mt-1">Parse your resume on the Resume tab to build your profile</div>
      </div>
    )
  }

  const skills       = profile.parsed_skills
  const softSkills   = profile.parsed_soft_skills ?? []
  const characterClass = deriveClass(skills)

  // Group by category, sort each group by level descending
  const grouped = skills.reduce((acc, skill) => {
    const cat = skill.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header — character identity */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs tracking-widest text-slate-400 uppercase mb-1">Character Sheet</div>
            <div className="text-xl font-bold text-slate-800">{user.email.split('@')[0]}</div>
            <div className="text-sm text-indigo-600 font-medium mt-0.5">{characterClass}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Last updated</div>
            <div className="text-xs text-slate-600">
              {new Date(profile.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Skills — grouped by category */}
      {Object.entries(grouped).map(([category, categorySkills]) => (
        <div key={category} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
          <div className="text-xs tracking-widest text-slate-400 uppercase mb-4">
            {category}
          </div>
          <div>
            {categorySkills
              .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
              .map(skill => (
                <StatBlock key={skill.name} skill={skill} />
              ))
            }
          </div>
        </div>
      ))}

      {/* Behavioral Traits */}
      {softSkills.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
          <div className="text-xs tracking-widest text-slate-400 uppercase mb-4">
            Behavioral Traits
          </div>
          <div className="flex flex-wrap gap-2">
            {softSkills.map(trait => (
              <span
                key={trait.name}
                className="text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
              >
                ✦ {trait.name}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
