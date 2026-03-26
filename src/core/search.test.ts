import { searchFlags, fuzzyMatch, buildTagIndex, buildOwnerIndex, groupBy } from './search';
import { FlagDefinition } from './types';

describe('Search', () => {
  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  });

  const flags = [
    makeFlag('dark-mode', { description: 'Toggle dark theme', tags: ['ui', 'frontend'], owner: 'design' }),
    makeFlag('api-rate-limit', { description: 'API rate limiting', tags: ['backend', 'api'], owner: 'platform' }),
    makeFlag('new-checkout', { description: 'New checkout flow', tags: ['frontend', 'experiment'], owner: 'growth' }),
    makeFlag('debug-mode', { description: 'Enable debug logging', tags: ['ops'], owner: 'platform' }),
  ];

  describe('searchFlags', () => {
    it('should find exact name match', () => {
      const results = searchFlags(flags, 'dark-mode');
      expect(results[0].flag.name).toBe('dark-mode');
      expect(results[0].score).toBe(100);
    });

    it('should find prefix match', () => {
      const results = searchFlags(flags, 'dark');
      expect(results[0].flag.name).toBe('dark-mode');
    });

    it('should find by description', () => {
      const results = searchFlags(flags, 'checkout');
      expect(results.some(r => r.flag.name === 'new-checkout')).toBe(true);
    });

    it('should find by tag', () => {
      const results = searchFlags(flags, 'frontend');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should find by owner', () => {
      const results = searchFlags(flags, 'platform');
      expect(results.length).toBe(2);
    });

    it('should return empty for no match', () => {
      const results = searchFlags(flags, 'zzzznotfound');
      expect(results).toHaveLength(0);
    });

    it('should sort by relevance', () => {
      const results = searchFlags(flags, 'mode');
      expect(results.length).toBeGreaterThan(0);
      // All scores should be descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should respect maxResults', () => {
      const results = searchFlags(flags, 'a', { maxResults: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should support fuzzy matching', () => {
      const results = searchFlags(flags, 'drk', { fuzzy: true });
      expect(results.some(r => r.flag.name === 'dark-mode')).toBe(true);
    });

    it('should filter by specific fields', () => {
      const results = searchFlags(flags, 'platform', { fields: ['name'] });
      expect(results).toHaveLength(0);
    });
  });

  describe('fuzzyMatch', () => {
    it('should match subsequence', () => {
      expect(fuzzyMatch('dark-mode', 'drk')).toBe(true);
    });

    it('should not match out of order', () => {
      expect(fuzzyMatch('abc', 'cab')).toBe(false);
    });

    it('should match exact', () => {
      expect(fuzzyMatch('test', 'test')).toBe(true);
    });

    it('should handle empty pattern', () => {
      expect(fuzzyMatch('anything', '')).toBe(true);
    });
  });

  describe('buildTagIndex', () => {
    it('should index flags by tags', () => {
      const index = buildTagIndex(flags);
      expect(index.get('frontend')?.length).toBe(2);
      expect(index.get('ops')?.length).toBe(1);
    });

    it('should handle flags without tags', () => {
      const index = buildTagIndex([makeFlag('no-tags')]);
      expect(index.size).toBe(0);
    });
  });

  describe('buildOwnerIndex', () => {
    it('should index flags by owner', () => {
      const index = buildOwnerIndex(flags);
      expect(index.get('platform')?.length).toBe(2);
    });
  });

  describe('groupBy', () => {
    it('should group by status', () => {
      const mixed = [
        makeFlag('a', { status: 'active' }),
        makeFlag('b', { status: 'inactive' }),
        makeFlag('c', { status: 'active' }),
      ];
      const groups = groupBy(mixed, 'status');
      expect(groups.get('active')?.length).toBe(2);
      expect(groups.get('inactive')?.length).toBe(1);
    });

    it('should group by type', () => {
      const mixed = [
        makeFlag('a', { type: 'boolean' }),
        makeFlag('b', { type: 'string', defaultValue: '' }),
      ];
      const groups = groupBy(mixed, 'type');
      expect(groups.get('boolean')?.length).toBe(1);
    });
  });
});
