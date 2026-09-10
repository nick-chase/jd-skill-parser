import { useNavigate } from 'react-router-dom'

export default function ReferenceFooter() {
  const navigate = useNavigate()

  function handleBack() {
    const idx = window.history.state?.idx ?? 0
    if (idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <footer className="text-xs text-gray-400 text-center py-4 mt-auto">
      <button type="button" onClick={handleBack} className="hover:underline">
        ← Back to Nat20
      </button>
    </footer>
  )
}
