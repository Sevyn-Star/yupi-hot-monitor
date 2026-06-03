import { describe, it, expect } from 'vitest';
import { SOURCE_IDS } from '../services/settings.js';

describe('aggregateSearch wiring', () => {
  it('SOURCE_IDS includes core international and community sources', () => {
    expect(SOURCE_IDS).toContain('google');
    expect(SOURCE_IDS).toContain('duckduckgo');
    expect(SOURCE_IDS).toContain('github');
    expect(SOURCE_IDS).toContain('huggingface');
    expect(SOURCE_IDS.length).toBeGreaterThanOrEqual(10);
  });
});
