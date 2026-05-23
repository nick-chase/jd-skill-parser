import { test, expect } from 'vitest';
import { getAllSkillEntries } from '../src/lib/registry.js';

test('registry is importable and exports getAllSkillEntries', () => {
  expect(typeof getAllSkillEntries).toBe('function');
});
