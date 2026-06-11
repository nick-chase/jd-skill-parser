// Fingerprint based on employer/institution names + grad year only.
// Immune to bullet edits and skill additions — stable identity signal.

export function buildFingerprint(parsedResume) {
  const employers = []
  const blocks = parsedResume?.experience ?? parsedResume?.blocks ?? []
  for (const block of blocks) {
    const name = block.employer ?? block.institution ?? block.company ?? block.title ?? ''
    if (name) employers.push(name.trim().toLowerCase())
    if (employers.length >= 3) break
  }
  while (employers.length < 3) employers.push('')
  const gradYear = String(
    parsedResume?.degree?.graduationYear ??
    parsedResume?.degrees?.[0]?.graduationYear ??
    ''
  )
  const raw = [...employers, gradYear].join('|')
  return btoa(raw)
}

export function getStoredFingerprint() {
  try {
    const raw = localStorage.getItem('nat20_resume_fp')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveFingerprint(fingerprint) {
  try {
    localStorage.setItem('nat20_resume_fp', JSON.stringify({ fingerprint, savedAt: Date.now() }))
  } catch {}
}

export function isSameResume(newFingerprint) {
  const stored = getStoredFingerprint()
  if (!stored) return false
  return stored.fingerprint === newFingerprint
}
