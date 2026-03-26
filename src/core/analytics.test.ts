import { FlagAnalytics } from './analytics';
import { EvaluationResult } from './types';

describe('FlagAnalytics', () => {
  let analytics: FlagAnalytics;

  beforeEach(() => {
    analytics = new FlagAnalytics();
  });

  const makeResult = (flagName: string, value: any, reason: string = 'default'): EvaluationResult => ({
    flagName,
    value,
    reason: reason as EvaluationResult['reason'],
    timestamp: new Date().toISOString(),
  });

  describe('record', () => {
    it('should record evaluation', () => {
      analytics.record(makeResult('flag-a', true));
      expect(analytics.getMetrics('flag-a')).toBeDefined();
      expect(analytics.getMetrics('flag-a')!.evaluationCount).toBe(1);
    });

    it('should increment counts', () => {
      analytics.record(makeResult('flag-a', true));
      analytics.record(makeResult('flag-a', false));
      analytics.record(makeResult('flag-a', true));
      const m = analytics.getMetrics('flag-a')!;
      expect(m.evaluationCount).toBe(3);
      expect(m.trueCount).toBe(2);
      expect(m.falseCount).toBe(1);
    });

    it('should track reason counts', () => {
      analytics.record(makeResult('flag-a', true, 'default'));
      analytics.record(makeResult('flag-a', true, 'rule'));
      analytics.record(makeResult('flag-a', true, 'default'));
      const m = analytics.getMetrics('flag-a')!;
      expect(m.reasonCounts['default']).toBe(2);
      expect(m.reasonCounts['rule']).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('should return summary', () => {
      analytics.record(makeResult('a', true));
      analytics.record(makeResult('a', true));
      analytics.record(makeResult('b', false));
      const summary = analytics.getSummary();
      expect(summary.totalEvaluations).toBe(3);
      expect(summary.uniqueFlags).toBe(2);
      expect(summary.mostEvaluated).toBe('a');
      expect(summary.leastEvaluated).toBe('b');
    });

    it('should handle empty analytics', () => {
      const summary = analytics.getSummary();
      expect(summary.totalEvaluations).toBe(0);
      expect(summary.mostEvaluated).toBeNull();
    });
  });

  describe('getStaleFlags', () => {
    it('should find unevaluated flags', () => {
      analytics.record(makeResult('used', true));
      const stale = analytics.getStaleFlags(['used', 'unused']);
      expect(stale).toEqual(['unused']);
    });
  });

  describe('getTrueRate', () => {
    it('should calculate true rate', () => {
      analytics.record(makeResult('flag', true));
      analytics.record(makeResult('flag', true));
      analytics.record(makeResult('flag', false));
      expect(analytics.getTrueRate('flag')).toBeCloseTo(0.667, 2);
    });

    it('should return null for unknown flag', () => {
      expect(analytics.getTrueRate('unknown')).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      analytics.record(makeResult('a', true));
      analytics.reset();
      expect(analytics.getMetrics('a')).toBeUndefined();
    });
  });

  describe('export/import', () => {
    it('should roundtrip metrics', () => {
      analytics.record(makeResult('a', true));
      analytics.record(makeResult('a', false));
      const exported = analytics.export();

      const analytics2 = new FlagAnalytics();
      analytics2.import(exported);
      expect(analytics2.getMetrics('a')!.evaluationCount).toBe(2);
    });
  });
});
