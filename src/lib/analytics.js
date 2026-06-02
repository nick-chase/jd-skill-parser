// Plausible custom event helper.
// No-ops if Plausible hasn't loaded or in environments where window is absent.

export function trackEvent(eventName, props = {}) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(eventName, { props })
  }
}

export const analytics = {
  parseComplete: (type) =>
    trackEvent('Parse Complete', { type }), // type: 'jd' | 'resume'

  upgradeClick: (source) =>
    trackEvent('Upgrade Click', { source }), // source: 'pricing' | 'parse_limit' | 'pdf_gate' | 'profile_gate'

  signup: () =>
    trackEvent('Signup'),
}
