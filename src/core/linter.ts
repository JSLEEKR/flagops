/**
 * Flag linter — lint rules for flag manifest hygiene
 */
import { FlagDefinition, FlagManifest, ValidationError } from './types';

export interface LintRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: (flag: FlagDefinition, manifest: FlagManifest) => string | null;
}

export const builtinRules: LintRule[] = [
  {
    id: 'no-description',
    name: 'Missing description',
    severity: 'warning',
    check: (flag) => !flag.description ? `Flag '${flag.name}' has no description` : null,
  },
  {
    id: 'no-owner',
    name: 'Missing owner',
    severity: 'warning',
    check: (flag) => !flag.owner ? `Flag '${flag.name}' has no owner assigned` : null,
  },
  {
    id: 'no-tags',
    name: 'Missing tags',
    severity: 'info',
    check: (flag) => (!flag.tags || flag.tags.length === 0) ? `Flag '${flag.name}' has no tags` : null,
  },
  {
    id: 'stale-flag',
    name: 'Potentially stale flag',
    severity: 'warning',
    check: (flag) => {
      if (!flag.updatedAt) return null;
      const updated = new Date(flag.updatedAt);
      const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 90 ? `Flag '${flag.name}' hasn't been updated in ${Math.floor(daysSince)} days` : null;
    },
  },
  {
    id: 'expired-active',
    name: 'Active but expired',
    severity: 'error',
    check: (flag) => {
      if (!flag.expiresAt || flag.status !== 'active') return null;
      const expiry = new Date(flag.expiresAt);
      return expiry < new Date() ? `Flag '${flag.name}' is active but expired on ${flag.expiresAt}` : null;
    },
  },
  {
    id: 'invalid-rollout',
    name: 'Invalid rollout percentage',
    severity: 'error',
    check: (flag) => {
      if (!flag.rollout) return null;
      if (flag.rollout.percentage < 0 || flag.rollout.percentage > 100) {
        return `Flag '${flag.name}' has invalid rollout percentage: ${flag.rollout.percentage}`;
      }
      return null;
    },
  },
  {
    id: 'empty-environments',
    name: 'Empty environments',
    severity: 'info',
    check: (flag) => {
      if (flag.environments && flag.environments.length === 0) {
        return `Flag '${flag.name}' has empty environments array`;
      }
      return null;
    },
  },
  {
    id: 'naming-convention',
    name: 'Naming convention',
    severity: 'warning',
    check: (flag) => {
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(flag.name)) {
        return `Flag '${flag.name}' doesn't follow kebab-case naming convention`;
      }
      return null;
    },
  },
  {
    id: 'too-many-rules',
    name: 'Excessive targeting rules',
    severity: 'info',
    check: (flag) => {
      if (flag.rules && flag.rules.length > 10) {
        return `Flag '${flag.name}' has ${flag.rules.length} targeting rules — consider simplifying`;
      }
      return null;
    },
  },
];

/**
 * Run lint rules against a manifest
 */
export function lintManifest(
  manifest: FlagManifest,
  rules?: LintRule[],
  severityFilter?: ('error' | 'warning' | 'info')[]
): LintResult[] {
  const activeRules = rules || builtinRules;
  const results: LintResult[] = [];

  for (const flag of manifest.flags) {
    for (const rule of activeRules) {
      if (severityFilter && !severityFilter.includes(rule.severity)) continue;
      const message = rule.check(flag, manifest);
      if (message) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          flagName: flag.name,
          message,
        });
      }
    }
  }

  return results;
}

export interface LintResult {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  flagName: string;
  message: string;
}

/**
 * Get lint summary
 */
export function getLintSummary(results: LintResult[]): { errors: number; warnings: number; info: number } {
  return {
    errors: results.filter(r => r.severity === 'error').length,
    warnings: results.filter(r => r.severity === 'warning').length,
    info: results.filter(r => r.severity === 'info').length,
  };
}

/**
 * Check if lint results have errors
 */
export function hasLintErrors(results: LintResult[]): boolean {
  return results.some(r => r.severity === 'error');
}
