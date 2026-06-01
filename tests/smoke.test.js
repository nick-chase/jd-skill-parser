import { test, expect } from 'vitest';
import { getAllSkillEntries } from '@core/registry.js';

test('registry is importable and exports getAllSkillEntries', () => {
  expect(typeof getAllSkillEntries).toBe('function');
});
