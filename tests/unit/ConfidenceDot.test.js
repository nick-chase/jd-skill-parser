/**
 * Tests for ConfidenceDot
 *
 * React Testing Library is not installed in this project, so these tests
 * verify the component's contract by calling it as a plain function and
 * inspecting the returned React element (same pattern as TierBadge.test.js).
 *
 * Approach:
 *   - Renders without throwing for 'high' / 'medium' / other confidence values
 *   - Renders a sensible default (gray dot) when confidence is null/undefined
 */

import { describe, test, expect } from 'vitest'
import ConfidenceDot from '../../src/components/ConfidenceDot.jsx'

describe('ConfidenceDot', () => {
  test('renders green for confidence "high"', () => {
    const element = ConfidenceDot({ confidence: 'high' })
    expect(element).not.toBeNull()
    expect(element.props.style.color).toBe('#22c55e')
  })

  test('renders amber for confidence "medium"', () => {
    const element = ConfidenceDot({ confidence: 'medium' })
    expect(element).not.toBeNull()
    expect(element.props.style.color).toBe('#f59e0b')
  })

  test('does not crash when confidence is null — renders default gray dot', () => {
    let element
    expect(() => { element = ConfidenceDot({ confidence: null }) }).not.toThrow()
    expect(element).not.toBeNull()
    expect(element.props.style.color).toBe('#94a3b8')
    expect(element.props.children).toBe('●')
  })

  test('does not crash when confidence is undefined — renders default gray dot', () => {
    let element
    expect(() => { element = ConfidenceDot({}) }).not.toThrow()
    expect(element).not.toBeNull()
    expect(element.props.style.color).toBe('#94a3b8')
  })
})
