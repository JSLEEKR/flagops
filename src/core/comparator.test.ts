import { compareManifests, generateSyncPlan, getComparisonSummary } from './comparator';
import { FlagManifest, FlagDefinition } from './types';

describe('Comparator', () => {
  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024',
    updatedAt: '2024',
    ...overrides,
  });

  const manifest = (flags: FlagDefinition[]): FlagManifest => ({ version: '1.0', flags });

  describe('compareManifests', () => {
    it('should find source-only flags', () => {
      const result = compareManifests(
        manifest([makeFlag('a'), makeFlag('b')]),
        manifest([makeFlag('b')])
      );
      expect(result.sourceOnly).toEqual(['a']);
    });

    it('should find target-only flags', () => {
      const result = compareManifests(
        manifest([makeFlag('a')]),
        manifest([makeFlag('a'), makeFlag('b')])
      );
      expect(result.targetOnly).toEqual(['b']);
    });

    it('should find differences', () => {
      const result = compareManifests(
        manifest([makeFlag('a', { status: 'active' })]),
        manifest([makeFlag('a', { status: 'inactive' })])
      );
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.differences[0].fieldName).toBe('status');
    });

    it('should find identical flags', () => {
      const flag = makeFlag('same');
      const result = compareManifests(
        manifest([flag]),
        manifest([{ ...flag }])
      );
      expect(result.identical).toEqual(['same']);
    });

    it('should handle empty manifests', () => {
      const result = compareManifests(manifest([]), manifest([]));
      expect(result.sourceOnly).toHaveLength(0);
      expect(result.targetOnly).toHaveLength(0);
      expect(result.differences).toHaveLength(0);
    });

    it('should respect field filter', () => {
      const result = compareManifests(
        manifest([makeFlag('a', { status: 'active', description: 'old' })]),
        manifest([makeFlag('a', { status: 'inactive', description: 'new' })]),
        ['status']
      );
      expect(result.differences).toHaveLength(1);
      expect(result.differences[0].fieldName).toBe('status');
    });
  });

  describe('generateSyncPlan', () => {
    it('should generate add actions', () => {
      const comparison = compareManifests(
        manifest([makeFlag('new')]),
        manifest([])
      );
      const plan = generateSyncPlan(comparison);
      expect(plan.some(a => a.type === 'add' && a.flagName === 'new')).toBe(true);
    });

    it('should generate remove actions', () => {
      const comparison = compareManifests(
        manifest([]),
        manifest([makeFlag('old')])
      );
      const plan = generateSyncPlan(comparison);
      expect(plan.some(a => a.type === 'remove' && a.flagName === 'old')).toBe(true);
    });

    it('should generate update actions', () => {
      const comparison = compareManifests(
        manifest([makeFlag('mod', { status: 'active' })]),
        manifest([makeFlag('mod', { status: 'inactive' })])
      );
      const plan = generateSyncPlan(comparison);
      expect(plan.some(a => a.type === 'update' && a.flagName === 'mod')).toBe(true);
    });
  });

  describe('getComparisonSummary', () => {
    it('should return summary string', () => {
      const comparison = compareManifests(
        manifest([makeFlag('a')]),
        manifest([makeFlag('b')])
      );
      const summary = getComparisonSummary(comparison);
      expect(summary).toContain('Source only: 1');
      expect(summary).toContain('Target only: 1');
    });
  });
});
