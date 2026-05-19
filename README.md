# Tech Job Skill Parser

A web app that parses job descriptions and your resume to identify skill gaps for tech roles (Software Engineering, ML/AI, Data Science).

**🔗 [Live App](https://jd-skill-parser.vercel.app)**

## Features

- **Parse Job Descriptions** — Extract required skills, proficiency levels, and importance tiers
- **Parse Resume** — Analyze your technical skills from education, projects, and experience
- **Gap Analysis** — See exactly what skills you're missing and what needs improvement
- **Role Templates** — Get baseline skill expectations for common tech roles
- **Job Metadata** — Extract location type, job type, and company info

## How It Works

### 1. Parse a Job Description
Paste any tech job description and the parser extracts:
- Skill names (matched against 100+ skill dictionary)
- Proficiency levels (L1-L5 based on context and experience years)
- Importance tiers (Critical, Required, Preferred, Nice-to-have)

### 2. Parse Your Resume
Upload your resume (text paste for now, PDF coming soon) and extract:
- Technical skills from coursework (capped at L2 for students)
- Skills from projects (L2 for academic projects)
- Professional experience (L3+ only for tech roles)

### 3. See Your Gap Analysis
Compare your skills against the job:
- ✅ Matched skills (you meet the requirement)
- ⚠️ Level gaps (you have it but need more depth)
- ❌ Missing critical skills (priority to learn)
- 🎁 Bonus skills (you have but JD doesn't ask for)

## Project Status

**In Development** — Currently optimized for Software Engineering, ML/AI, and Data Science roles.

## Roadmap

### ✅ v1.0 (Live Now)
- [x] Parse job descriptions for skills, importance, level
- [x] Parse resumes for skill extraction by section
- [x] Gap analysis: match % + missing skills
- [x] Company/role/metadata extraction
- [x] 100+ skills in dictionary
- [x] 10 role templates with critical/required/preferred lists

### 📋 v2.0 (Upcoming)
- [ ] **PDF resume upload & parsing** (highest priority)
- [ ] Expand tech roles library (20+ roles)
- [ ] Add Cyber roles library
- [ ] Add financial roles library
- [ ] Chrome extension (scrape LinkedIn/Indeed JDs)

### 🚀 v3.0 (Future)
- [ ] Learning path recommendations
- [ ] Salary/location insights per role
- [ ] ???

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Parsing:** Rule-based skill extraction (extensible for AI later)
- **Classification:** OPM 5-Level Scale + Lightcast skill taxonomy

## Getting Started

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm 10+

### Installation

1. Clone the repository
```bash
git clone https://github.com/nick-chase/jd-skill-parser.git
cd jd-skill-parser
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```
The app will open at `http://localhost:5173`

4. Build for production
```bash
npm run build
```

### Development
- Styling: Tailwind CSS
- Main component: `src/jd-skill-parser.jsx`
- Skill dictionary & role templates are in the same file (ready to refactor into separate files)

### Technologies
- React 18 + Vite
- Tailwind CSS 4
- Deployed on Vercel - Link at top of page-

## Author

[Nicholas Chase](https://github.com/nick-chase) — NJIT MS Artificial Intelligence

---

**Note:** This is an educational project. Skill classifications are rule-based heuristics, not formal assessments.
