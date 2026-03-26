import { formatFlag, formatFlagTable, formatEvaluation, formatStats, formatValidationErrors } from './formatter';
import { FlagDefinition, EvaluationResult, FlagStats, ValidationError } from '../core/types';

// Strip ANSI codes for testing
function strip(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('Formatter', () => {
  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  });

  describe('formatFlag', () => {
    it('should format basic flag', () => {
      const output = strip(formatFlag(makeFlag('test')));
      expect(output).toContain('test');
      expect(output).toContain('boolean');
    });

    it('should format verbose flag', () => {
      const output = strip(formatFlag(makeFlag('test', {
        description: 'A test flag',
        owner: 'team-a',
        tags: ['ui', 'beta'],
      }), true));
      expect(output).toContain('A test flag');
      expect(output).toContain('team-a');
      expect(output).toContain('ui');
    });

    it('should show environment info in verbose', () => {
      const output = strip(formatFlag(makeFlag('env-flag', {
        environments: [{ name: 'prod', enabled: true }],
      }), true));
      expect(output).toContain('prod');
    });

    it('should show rollout info in verbose', () => {
      const output = strip(formatFlag(makeFlag('rollout-flag', {
        rollout: { percentage: 50 },
      }), true));
      expect(output).toContain('50%');
    });

    it('should show expiry in verbose', () => {
      const output = strip(formatFlag(makeFlag('exp-flag', {
        expiresAt: '2025-01-01',
      }), true));
      expect(output).toContain('2025-01-01');
    });
  });

  describe('formatFlagTable', () => {
    it('should format table with flags', () => {
      const flags = [makeFlag('a'), makeFlag('b', { tags: ['ui'] })];
      const output = strip(formatFlagTable(flags));
      expect(output).toContain('Name');
      expect(output).toContain('Status');
      expect(output).toContain('a');
      expect(output).toContain('b');
    });

    it('should handle empty list', () => {
      const output = strip(formatFlagTable([]));
      expect(output).toContain('No flags found');
    });
  });

  describe('formatEvaluation', () => {
    it('should format true result', () => {
      const result: EvaluationResult = {
        flagName: 'test',
        value: true,
        reason: 'default',
        timestamp: '2024-01-01',
      };
      const output = strip(formatEvaluation(result));
      expect(output).toContain('test');
      expect(output).toContain('true');
    });

    it('should format false result', () => {
      const result: EvaluationResult = {
        flagName: 'test',
        value: false,
        reason: 'disabled',
        timestamp: '2024-01-01',
      };
      const output = strip(formatEvaluation(result));
      expect(output).toContain('false');
    });

    it('should format string result', () => {
      const result: EvaluationResult = {
        flagName: 'test',
        value: 'hello',
        reason: 'default',
        timestamp: '2024-01-01',
      };
      const output = strip(formatEvaluation(result));
      expect(output).toContain('hello');
    });
  });

  describe('formatStats', () => {
    it('should format statistics', () => {
      const stats: FlagStats = {
        total: 10,
        active: 5,
        inactive: 3,
        archived: 2,
        expired: 1,
        byType: { boolean: 8, string: 2 },
        byTag: { ui: 3, backend: 4 },
      };
      const output = strip(formatStats(stats));
      expect(output).toContain('10');
      expect(output).toContain('5');
      expect(output).toContain('boolean');
      expect(output).toContain('ui');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors', () => {
      const errors: ValidationError[] = [
        { field: 'test.name', message: 'Invalid name', severity: 'error' },
        { field: 'test.desc', message: 'Missing desc', severity: 'warning' },
      ];
      const output = strip(formatValidationErrors(errors));
      expect(output).toContain('Invalid name');
      expect(output).toContain('Missing desc');
    });

    it('should show success message for no errors', () => {
      const output = strip(formatValidationErrors([]));
      expect(output).toContain('No validation issues');
    });
  });
});
