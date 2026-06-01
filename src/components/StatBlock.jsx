const LEVEL_LABELS = {
  1: { primary: 'Awareness',     secondary: 'Apprentice' },
  2: { primary: 'Novice',        secondary: 'Adventurer' },
  3: { primary: 'Intermediate',  secondary: 'Journeyman' },
  4: { primary: 'Advanced',      secondary: 'Veteran'    },
  5: { primary: 'Expert',        secondary: 'Master'     },
}

const CATEGORY_COLORS = {
  'Programming Language': 'bg-indigo-500',
  'Cloud / Infra':        'bg-sky-500',
  'Database':             'bg-emerald-500',
  'ML / AI':              'bg-violet-500',
  'Dev Tool':             'bg-amber-500',
  'Framework':            'bg-rose-500',
  'default':              'bg-slate-400',
}

export default function StatBlock({ skill }) {
  const level    = skill.level ?? 1
  const labels   = LEVEL_LABELS[level] ?? LEVEL_LABELS[1]
  const barColor = CATEGORY_COLORS[skill.category] ?? CATEGORY_COLORS['default']

  return (
    <div className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-0">
      {/* Skill name + category */}
      <div className="w-36 shrink-0">
        <div className="text-sm font-medium text-slate-800">{skill.name}</div>
        <div className="text-xs text-slate-400">{skill.category}</div>
      </div>

      {/* XP bar — 5 segments */}
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`h-2.5 flex-1 rounded-sm ${i <= level ? barColor : 'bg-slate-100'}`}
          />
        ))}
      </div>

      {/* Level label */}
      <div className="w-28 shrink-0 text-right">
        <div className="text-sm font-semibold text-slate-700">{labels.primary}</div>
        <div className="text-xs text-slate-400 tracking-wide">{labels.secondary}</div>
      </div>
    </div>
  )
}
