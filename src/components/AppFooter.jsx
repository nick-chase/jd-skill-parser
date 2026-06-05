import { Link } from 'react-router-dom'

export default function AppFooter() {
  return (
    <footer className="text-xs text-gray-400 text-center py-4 mt-auto">
      © 2026 Nat20 · <Link to="/privacy" className="hover:underline">Privacy Policy</Link> · <Link to="/terms" className="hover:underline">Terms of Service</Link> · <a href="mailto:devteam@nat20app.com" className="hover:underline">Contact</a>
    </footer>
  )
}
