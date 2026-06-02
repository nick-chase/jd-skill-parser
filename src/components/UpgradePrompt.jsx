import { Link } from 'react-router-dom'

const MESSAGES = {
  parse_limit: {
    title: "You've used your 15 free parses today",
    body: "Upgrade to Pro for unlimited JD parsing, PDF upload, and your character sheet.",
  },
  pdf: {
    title: "PDF upload is a Pro feature",
    body: "Upgrade to Pro to upload your resume as a PDF — no copy-paste needed.",
  },
  profile: {
    title: "Character sheet is a Pro feature",
    body: "Upgrade to Pro to unlock your skill XP bars, class, and progress tracking.",
  },
}

export default function UpgradePrompt({ reason }) {
  const { title, body } = MESSAGES[reason] ?? MESSAGES.parse_limit

  return (
    <div className="border border-indigo-200 rounded-xl p-6 bg-indigo-50 text-center space-y-3">
      <div className="text-lg font-semibold text-indigo-900">{title}</div>
      <div className="text-sm text-indigo-700">{body}</div>
      <Link to="/pricing">
        <button className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          Upgrade to Pro — $9.99/mo
        </button>
      </Link>
      <div className="text-xs text-indigo-500">Cancel anytime</div>
    </div>
  )
}
