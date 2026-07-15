/**
 * Tests for GapResourceLink
 *
 * React Testing Library is not installed in this project, so these tests
 * verify the component's contract by calling it as a plain function and
 * inspecting the returned React element (same pattern as TierBadge.test.js).
 *
 * Approach:
 *   - Renders null gracefully when resource is null/undefined (no matching
 *     affiliate data) — component must not throw.
 *   - Renders the link when a valid resource is passed (smoke test).
 */

import { describe, test, expect } from 'vitest'
import GapResourceLink from '../../src/components/GapResourceLink.jsx'

describe('GapResourceLink', () => {
  test('renders null when resource is null', () => {
    let element
    expect(() => { element = GapResourceLink({ resource: null }) }).not.toThrow()
    expect(element).toBeNull()
  })

  test('renders null when resource is undefined', () => {
    let element
    expect(() => { element = GapResourceLink({}) }).not.toThrow()
    expect(element).toBeNull()
  })

  test('renders a link element when a valid resource is passed', () => {
    const resource = { title: 'Learn AWS', url: 'https://example.com/aws', platform: 'Coursera' }
    let element
    expect(() => { element = GapResourceLink({ resource }) }).not.toThrow()
    expect(element).not.toBeNull()
  })
})
