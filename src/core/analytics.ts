/**
 * Flag analytics — track evaluation metrics and usage patterns
 */
import { EvaluationResult } from './types';

export interface FlagMetrics {
  flagName: string;
  evaluationCount: number;
  trueCount: number;
  falseCount: number;
  reasonCounts: Record<string, number>;
  lastEvaluated: string;
  firstEvaluated: string;
}

export interface AnalyticsSummary {
  totalEvaluations: number;
  uniqueFlags: number;
  mostEvaluated: string | null;
  leastEvaluated: string | null;
  flagMetrics: FlagMetrics[];
}

export class FlagAnalytics {
  private metrics: Map<string, FlagMetrics> = new Map();
  private maxHistory: number;

  constructor(maxHistory: number = 10000) {
    this.maxHistory = maxHistory;
  }

  /**
   * Record an evaluation result
   */
  record(result: EvaluationResult): void {
    const existing = this.metrics.get(result.flagName);
    const now = result.timestamp || new Date().toISOString();

    if (existing) {
      existing.evaluationCount++;
      if (result.value === true) existing.trueCount++;
      if (result.value === false) existing.falseCount++;
      existing.reasonCounts[result.reason] = (existing.reasonCounts[result.reason] || 0) + 1;
      existing.lastEvaluated = now;
    } else {
      this.metrics.set(result.flagName, {
        flagName: result.flagName,
        evaluationCount: 1,
        trueCount: result.value === true ? 1 : 0,
        falseCount: result.value === false ? 1 : 0,
        reasonCounts: { [result.reason]: 1 },
        lastEvaluated: now,
        firstEvaluated: now,
      });
    }
  }

  /**
   * Get metrics for a specific flag
   */
  getMetrics(flagName: string): FlagMetrics | undefined {
    return this.metrics.get(flagName);
  }

  /**
   * Get summary of all analytics
   */
  getSummary(): AnalyticsSummary {
    const allMetrics = [...this.metrics.values()];
    const totalEvaluations = allMetrics.reduce((sum, m) => sum + m.evaluationCount, 0);

    let mostEvaluated: string | null = null;
    let leastEvaluated: string | null = null;
    let maxCount = 0;
    let minCount = Infinity;

    for (const m of allMetrics) {
      if (m.evaluationCount > maxCount) {
        maxCount = m.evaluationCount;
        mostEvaluated = m.flagName;
      }
      if (m.evaluationCount < minCount) {
        minCount = m.evaluationCount;
        leastEvaluated = m.flagName;
      }
    }

    return {
      totalEvaluations,
      uniqueFlags: allMetrics.length,
      mostEvaluated,
      leastEvaluated: allMetrics.length > 0 ? leastEvaluated : null,
      flagMetrics: allMetrics.sort((a, b) => b.evaluationCount - a.evaluationCount),
    };
  }

  /**
   * Get flags that are never evaluated (stale)
   */
  getStaleFlags(allFlagNames: string[]): string[] {
    return allFlagNames.filter(name => !this.metrics.has(name));
  }

  /**
   * Calculate true rate for a flag
   */
  getTrueRate(flagName: string): number | null {
    const m = this.metrics.get(flagName);
    if (!m || m.evaluationCount === 0) return null;
    return m.trueCount / m.evaluationCount;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify([...this.metrics.values()], null, 2);
  }

  /**
   * Import metrics from JSON
   */
  import(data: string): void {
    const parsed: FlagMetrics[] = JSON.parse(data);
    for (const m of parsed) {
      this.metrics.set(m.flagName, m);
    }
  }
}
