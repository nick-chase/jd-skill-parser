import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import JdSkillParser from './jd-skill-parser.jsx'
import AccountPage from './pages/AccountPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import LandingPage from './pages/LandingPage.jsx'

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
  return (
    <BrowserRouter>
      <Analytics />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<JdSkillParser />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
