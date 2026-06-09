import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import JdSkillParser from './jd-skill-parser.jsx'
import AccountPage from './pages/AccountPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import TermsPage from './pages/TermsPage.jsx'

function Analytics() {
  const location = useLocation()
  useEffect(() => {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('pageview')
    }
  }, [location.pathname])
  return null
}

export default function App() {
  console.log('PAYMENTS_ENABLED:', import.meta.env.VITE_PAYMENTS_ENABLED)
  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<JdSkillParser />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
