export function getFastFixSections(allSections, isPaidUser) {
  if (isPaidUser) return { visible: allSections, blurred: [], remainingCount: 0 }
  if (!allSections || allSections.length === 0) return { visible: [], blurred: [], remainingCount: 0 }
  return {
    visible: [allSections[0]],
    blurred: allSections.slice(1),
    remainingCount: allSections.length - 1,
  }
}
