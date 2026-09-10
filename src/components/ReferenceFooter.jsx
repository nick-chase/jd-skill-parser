import { Link } from 'react-router-dom'

export default function ReferenceFooter() {
  return (
    <footer className="text-xs text-gray-400 text-center py-4 mt-auto">
      <Link to="/" className="hover:underline">← Back to Nat20</Link>
    </footer>
  )
}
