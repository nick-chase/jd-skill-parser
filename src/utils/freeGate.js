import { isSameResume, getStoredFingerprint } from './resumeFingerprint.js'

export function getFastFixSections(allSections, isPaidUser, currentHash) {
  if (isPaidUser) return { visible: allSections, blurred: [], remainingCount: 0 }
  if (!allSections || allSections.length === 0) return { visible: [], blurred: [], remainingCount: 0 }
  // Same resume or new resume — identical gate shape; hash storage is resumeFingerprint's concern
  return {
    visible: allSections.slice(0, 1),
    blurred: allSections.slice(1),
    remainingCount: allSections.slice(1).length,
  }
}

export { getStoredFingerprint }
