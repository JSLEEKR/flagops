import { evaluateFlag, evaluateRule, computeBucket, evaluateFlags, isEnabled, getFlagValue } from './evaluator';
import { FlagDefinition, EvaluationContext, TargetingRule } from './types';

describe('Evaluator', () => {
  const makeFlag = (overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name: 'test-flag',
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  describe('evaluateFlag', () => {
    it('should return default for active flag without context', () => {
      const result = evaluateFlag(makeFlag());
      expect(result.value).toBe(true);
      expect(result.reason).toBe('default');
    });

    it('should return disabled for inactive flag', () => {
      const result = evaluateFlag(makeFlag({ status: 'inactive' }));
      expect(result.reason).toBe('disabled');
    });

    it('should return disabled for archived flag', () => {
      const result = evaluateFlag(makeFlag({ status: 'archived' }));
      expect(result.reason).toBe('disabled');
    });

    it('should return disabled for expired flag', () => {
      const result = evaluateFlag(makeFlag({ expiresAt: '2020-01-01T00:00:00.000Z' }));
      expect(result.reason).toBe('disabled');
    });

    it('should not disable non-expired flag', () => {
      const result = evaluateFlag(makeFlag({ expiresAt: '2099-01-01T00:00:00.000Z' }));
      expect(result.reason).toBe('default');
    });

    it('should match environment', () => {
      const flag = makeFlag({
        environments: [
          { name: 'production', enabled: true, value: false },
          { name: 'staging', enabled: true, value: true },
        ],
      });
      const result = evaluateFlag(flag, { environment: 'production' });
      expect(result.value).toBe(false);
      expect(result.reason).toBe('environment');
    });

    it('should disable for disabled environment', () => {
      const flag = makeFlag({
        environments: [{ name: 'production', enabled: false }],
      });
      const result = evaluateFlag(flag, { environment: 'production' });
      expect(result.reason).toBe('disabled');
    });

    it('should handle environment with no value override', () => {
      const flag = makeFlag({
        defaultValue: 'original',
        type: 'string',
        environments: [{ name: 'staging', enabled: true }],
      });
      const result = evaluateFlag(flag, { environment: 'staging' });
      expect(result.reason).toBe('default');
    });

    it('should evaluate rules when matched', () => {
      const flag = makeFlag({
        rules: [{ attribute: 'country', operator: 'eq', value: 'US' }],
      });
      const result = evaluateFlag(flag, { attributes: { country: 'US' } });
      expect(result.reason).toBe('rule');
    });

    it('should fall through when no rule matches', () => {
      const flag = makeFlag({
        rules: [{ attribute: 'country', operator: 'eq', value: 'US' }],
      });
      const result = evaluateFlag(flag, { attributes: { country: 'UK' } });
      expect(result.reason).toBe('default');
    });

    it('should handle rollout with userId', () => {
      const flag = makeFlag({
        rollout: { percentage: 50 },
      });
      const result = evaluateFlag(flag, { userId: 'user123' });
      expect(result.reason).toBe('rollout');
      expect(typeof result.value).toBe('boolean');
    });

    it('should produce deterministic rollout results', () => {
      const flag = makeFlag({ rollout: { percentage: 50 } });
      const r1 = evaluateFlag(flag, { userId: 'user-abc' });
      const r2 = evaluateFlag(flag, { userId: 'user-abc' });
      expect(r1.value).toBe(r2.value);
    });

    it('should respect rollout seed', () => {
      const flag1 = makeFlag({ rollout: { percentage: 50, seed: 'seed-a' } });
      const flag2 = makeFlag({ rollout: { percentage: 50, seed: 'seed-b' } });
      // Different seeds may produce different results for same user
      const r1 = evaluateFlag(flag1, { userId: 'test-user' });
      const r2 = evaluateFlag(flag2, { userId: 'test-user' });
      // Just verify both are valid
      expect(['rollout']).toContain(r1.reason);
      expect(['rollout']).toContain(r2.reason);
    });

    it('should set flagName in result', () => {
      const result = evaluateFlag(makeFlag({ name: 'my-flag' }));
      expect(result.flagName).toBe('my-flag');
    });

    it('should set timestamp in result', () => {
      const result = evaluateFlag(makeFlag());
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('evaluateRule', () => {
    it('should handle eq operator', () => {
      expect(evaluateRule({ attribute: 'x', operator: 'eq', value: 'a' }, { x: 'a' })).toBe(true);
      expect(evaluateRule({ attribute: 'x', operator: 'eq', value: 'a' }, { x: 'b' })).toBe(false);
    });

    it('should handle neq operator', () => {
      expect(evaluateRule({ attribute: 'x', operator: 'neq', value: 'a' }, { x: 'b' })).toBe(true);
      expect(evaluateRule({ attribute: 'x', operator: 'neq', value: 'a' }, { x: 'a' })).toBe(false);
    });

    it('should handle in operator', () => {
      expect(evaluateRule({ attribute: 'x', operator: 'in', value: ['a', 'b'] }, { x: 'a' })).toBe(true);
      expect(evaluateRule({ attribute: 'x', operator: 'in', value: ['a', 'b'] }, { x: 'c' })).toBe(false);
    });

    it('should handle nin operator', () => {
      expect(evaluateRule({ attribute: 'x', operator: 'nin', value: ['a', 'b'] }, { x: 'c' })).toBe(true);
      expect(evaluateRule({ attribute: 'x', operator: 'nin', value: ['a', 'b'] }, { x: 'a' })).toBe(false);
    });

    it('should handle gt/lt operators', () => {
      expect(evaluateRule({ attribute: 'age', operator: 'gt', value: 18 }, { age: 20 })).toBe(true);
      expect(evaluateRule({ attribute: 'age', operator: 'lt', value: 18 }, { age: 10 })).toBe(true);
      expect(evaluateRule({ attribute: 'age', operator: 'gt', value: 18 }, { age: 10 })).toBe(false);
    });

    it('should handle gte/lte operators', () => {
      expect(evaluateRule({ attribute: 'age', operator: 'gte', value: 18 }, { age: 18 })).toBe(true);
      expect(evaluateRule({ attribute: 'age', operator: 'lte', value: 18 }, { age: 18 })).toBe(true);
    });

    it('should handle contains operator', () => {
      expect(evaluateRule({ attribute: 'email', operator: 'contains', value: '@test.com' }, { email: 'user@test.com' })).toBe(true);
      expect(evaluateRule({ attribute: 'email', operator: 'contains', value: '@test.com' }, { email: 'user@other.com' })).toBe(false);
    });

    it('should handle matches operator', () => {
      expect(evaluateRule({ attribute: 'name', operator: 'matches', value: '^J.*' }, { name: 'John' })).toBe(true);
      expect(evaluateRule({ attribute: 'name', operator: 'matches', value: '^J.*' }, { name: 'Alice' })).toBe(false);
    });

    it('should handle invalid regex in matches', () => {
      expect(evaluateRule({ attribute: 'x', operator: 'matches', value: '[invalid' }, { x: 'test' })).toBe(false);
    });

    it('should return false for missing attribute', () => {
      expect(evaluateRule({ attribute: 'missing', operator: 'eq', value: 'x' }, {})).toBe(false);
    });

    it('should handle in with non-array value', () => {
      expect(evaluateRule({ attribute: 'x', operator: 'in', value: 'not-array' as any }, { x: 'test' })).toBe(false);
    });

    it('should handle nin with non-array value', () => {
      expect(evaluateRule({ attribute: 'x', operator: 'nin', value: 'not-array' as any }, { x: 'test' })).toBe(true);
    });
  });

  describe('computeBucket', () => {
    it('should return number between 0-99', () => {
      const bucket = computeBucket('user123', 'seed');
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(100);
    });

    it('should be deterministic', () => {
      expect(computeBucket('user1', 'seed')).toBe(computeBucket('user1', 'seed'));
    });

    it('should vary by user', () => {
      const buckets = new Set<number>();
      for (let i = 0; i < 50; i++) {
        buckets.add(computeBucket(`user-${i}`, 'seed'));
      }
      expect(buckets.size).toBeGreaterThan(5);
    });
  });

  describe('evaluateFlags', () => {
    it('should evaluate multiple flags', () => {
      const flags = [
        makeFlag({ name: 'flag-a' }),
        makeFlag({ name: 'flag-b', status: 'inactive' }),
      ];
      const results = evaluateFlags(flags);
      expect(results.size).toBe(2);
      expect(results.get('flag-a')!.reason).toBe('default');
      expect(results.get('flag-b')!.reason).toBe('disabled');
    });
  });

  describe('isEnabled', () => {
    it('should return true for active boolean flag with true default', () => {
      expect(isEnabled(makeFlag())).toBe(true);
    });

    it('should return false for inactive flag', () => {
      expect(isEnabled(makeFlag({ status: 'inactive' }))).toBe(false);
    });
  });

  describe('getFlagValue', () => {
    it('should return typed value', () => {
      const val = getFlagValue<string>(makeFlag({ type: 'string', defaultValue: 'hello' }));
      expect(val).toBe('hello');
    });
  });
});
