import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import JdSkillParser from './jd-skill-parser.jsx'
import AccountPage from './pages/AccountPage.jsx'
import PricingPage from './pages/PricingPage.jsx'
import LandingPage from './pages/LandingPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
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
