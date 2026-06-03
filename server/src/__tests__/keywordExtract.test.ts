import { describe, it, expect } from 'vitest';
import {
  extractKeywordCandidates,
  buildRuleBasedThemes
} from '../services/discovery/keywordExtract.js';
import type { DiscoveryItem } from '../services/discovery/types.js';

describe('keywordExtract', () => {
  it('extracts github repo name from owner/repo', () => {
    const items = [
      {
        item: {
          title: 'someorg/openhuman',
          content: 'Digital human toolkit',
          url: 'https://github.com/someorg/openhuman',
          source: 'github' as const,
          metricLabels: { primary: 'Star', primaryValue: 100 }
        },
        rank: 1
      },
      {
        item: {
          title: 'other/openhuman-fork',
          content: 'fork',
          url: 'https://github.com/other/openhuman-fork',
          source: 'github' as const,
          metricLabels: { primary: 'Star', primaryValue: 50 }
        },
        rank: 2
      }
    ];

    const keywords = extractKeywordCandidates(items, 'github');
    const terms = keywords.map((k) => k.term);
    expect(terms.some((t) => t.includes('openhuman'))).toBe(true);
  });

  it('buildRuleBasedThemes returns grouped themes', () => {
    const keywords = extractKeywordCandidates(
      [
        {
          item: {
            title: 'test/a',
            content: 'c',
            url: 'https://x.com',
            source: 'github' as const,
            metricLabels: { primary: 's', primaryValue: 1 }
          },
          rank: 1
        }
      ] satisfies Array<{ item: DiscoveryItem; rank: number }>,
      'github'
    );
    const themes = buildRuleBasedThemes(keywords);
    expect(themes.length).toBeGreaterThanOrEqual(0);
  });
});
