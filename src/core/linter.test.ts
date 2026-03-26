import { lintManifest, getLintSummary, hasLintErrors, builtinRules } from './linter';
import { FlagManifest, FlagDefinition } from './types';

describe('Linter', () => {
  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  });

  const manifest = (flags: FlagDefinition[]): FlagManifest => ({ version: '1.0', flags });

  describe('lintManifest', () => {
    it('should warn on missing description', () => {
      const results = lintManifest(manifest([makeFlag('no-desc')]));
      expect(results.some(r => r.ruleId === 'no-description')).toBe(true);
    });

    it('should not warn when description exists', () => {
      const results = lintManifest(manifest([makeFlag('has-desc', { description: 'test' })]));
      expect(results.some(r => r.ruleId === 'no-description')).toBe(false);
    });

    it('should warn on missing owner', () => {
      const results = lintManifest(manifest([makeFlag('no-owner')]));
      expect(results.some(r => r.ruleId === 'no-owner')).toBe(true);
    });

    it('should info on missing tags', () => {
      const results = lintManifest(manifest([makeFlag('no-tags')]));
      expect(results.some(r => r.ruleId === 'no-tags')).toBe(true);
    });

    it('should error on expired active flag', () => {
      const results = lintManifest(manifest([
        makeFlag('expired', { expiresAt: '2020-01-01T00:00:00Z' }),
      ]));
      expect(results.some(r => r.ruleId === 'expired-active')).toBe(true);
    });

    it('should not error on non-expired flag', () => {
      const results = lintManifest(manifest([
        makeFlag('future', { expiresAt: '2099-01-01T00:00:00Z' }),
      ]));
      expect(results.some(r => r.ruleId === 'expired-active')).toBe(false);
    });

    it('should error on invalid rollout percentage', () => {
      const results = lintManifest(manifest([
        makeFlag('bad-rollout', { rollout: { percentage: 150 } }),
      ]));
      expect(results.some(r => r.ruleId === 'invalid-rollout')).toBe(true);
    });

    it('should warn on non-kebab-case names', () => {
      const results = lintManifest(manifest([makeFlag('CamelCase')]));
      expect(results.some(r => r.ruleId === 'naming-convention')).toBe(true);
    });

    it('should pass well-formed flag', () => {
      const results = lintManifest(manifest([
        makeFlag('good-flag', { description: 'test', owner: 'team', tags: ['ui'] }),
      ]));
      const errors = results.filter(r => r.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('should filter by severity', () => {
      const results = lintManifest(
        manifest([makeFlag('test')]),
        undefined,
        ['error']
      );
      expect(results.every(r => r.severity === 'error')).toBe(true);
    });
  });

  describe('getLintSummary', () => {
    it('should count by severity', () => {
      const results = lintManifest(manifest([
        makeFlag('test', { expiresAt: '2020-01-01T00:00:00Z' }),
      ]));
      const summary = getLintSummary(results);
      expect(summary.errors).toBeGreaterThan(0);
    });
  });

  describe('hasLintErrors', () => {
    it('should return true if errors exist', () => {
      const results = lintManifest(manifest([
        makeFlag('expired', { expiresAt: '2020-01-01T00:00:00Z' }),
      ]));
      expect(hasLintErrors(results)).toBe(true);
    });

    it('should return false for only warnings', () => {
      const results = [{ ruleId: 'test', ruleName: 'test', severity: 'warning' as const, flagName: 'x', message: 'warn' }];
      expect(hasLintErrors(results)).toBe(false);
    });
  });

  describe('builtinRules', () => {
    it('should have unique rule IDs', () => {
      const ids = builtinRules.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should all have check function', () => {
      expect(builtinRules.every(r => typeof r.check === 'function')).toBe(true);
    });
  });
});
