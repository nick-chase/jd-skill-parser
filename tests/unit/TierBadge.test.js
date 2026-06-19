/**
 * Tests for TierBadge
 *
 * React Testing Library is not installed in this project, so these tests
 * verify the component's contract by calling it as a plain function and
 * inspecting the returned React element.
 *
 * Approach:
 *   - Renders "Lite" when isPaidStatus is false
 *   - Renders "Pro" when isPaidStatus is true
 *   - Returns a non-null element (smoke test — no throw)
 */

import { describe, test, expect } from 'vitest'
import TierBadge from '../../src/components/TierBadge.jsx'

describe('TierBadge', () => {
  test('renders "Lite" when isPaidStatus is false', () => {
    const element = TierBadge({ isPaidStatus: false })
    expect(element).not.toBeNull()
    expect(element.props.children).toBe('Lite')
  })

  test('renders "Pro" when isPaidStatus is true', () => {
    const element = TierBadge({ isPaidStatus: true })
    expect(element).not.toBeNull()
    expect(element.props.children).toBe('Pro')
  })

  test('returns a React element without throwing (smoke test)', () => {
    expect(() => TierBadge({ isPaidStatus: false })).not.toThrow()
    expect(() => TierBadge({ isPaidStatus: true })).not.toThrow()
  })
})
