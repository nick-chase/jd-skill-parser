/**
 * Unit tests for src/utils/resolveToCanonical.js
 *
 * These tests verify exact alias-to-canonical-id resolution without
 * slugification or substring matching. All assertions use real alias
 * data from data/skills.json.
 */

import { describe, test, expect } from 'vitest'
import { resolveToCanonical } from '@utils/resolveToCanonical.js'

describe('resolveToCanonical()', () => {
  test('"LLMs" resolves to large-language-models (alias match, mixed-case)', () => {
    expect(resolveToCanonical('LLMs')).toBe('large-language-models')
  })

  test('"large-language-models" resolves to itself — canonical id round-trips', () => {
    // Canonical ids are now recognized directly; no need to be in the aliases array
    expect(resolveToCanonical('large-language-models')).toBe('large-language-models')
  })

  test('"python" (exact canonical id) resolves to itself', () => {
    expect(resolveToCanonical('python')).toBe('python')
  })

  test('"large language models" resolves to large-language-models (exact alias)', () => {
    expect(resolveToCanonical('large language models')).toBe('large-language-models')
  })

  test('"llms" (lowercase) resolves to large-language-models (case-insensitive alias)', () => {
    expect(resolveToCanonical('llms')).toBe('large-language-models')
  })

  test('"xyzunknown" returns null — no match in any alias list', () => {
    expect(resolveToCanonical('xyzunknown')).toBeNull()
  })

  test('"data science" resolves to data-scientist (exact alias)', () => {
    expect(resolveToCanonical('data science')).toBe('data-scientist')
  })

  test('"Python" resolves to "python" (canonical alias, case-insensitive)', () => {
    expect(resolveToCanonical('Python')).toBe('python')
  })

  test('"python" (lowercase) resolves to "python"', () => {
    expect(resolveToCanonical('python')).toBe('python')
  })

  test('null input returns null', () => {
    expect(resolveToCanonical(null)).toBeNull()
  })

  test('empty string returns null', () => {
    expect(resolveToCanonical('')).toBeNull()
  })

  test('"LLM" (singular) resolves to large-language-models', () => {
    expect(resolveToCanonical('LLM')).toBe('large-language-models')
  })
})
