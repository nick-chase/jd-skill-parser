import { BrowserRouter, Routes, Route } from 'react-router-dom'
import JdSkillParser from './jd-skill-parser.jsx'
import AccountPage from './pages/AccountPage.jsx'
import PricingPage from './pages/PricingPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JdSkillParser />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/pricing" element={<PricingPage />} />
      </Routes>
    </BrowserRouter>
  )
}
