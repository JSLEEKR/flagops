/**
 * Flag evaluation engine
 */
import { FlagDefinition, EvaluationContext, EvaluationResult, FlagValue, TargetingRule } from './types';
import { hashString } from '../utils/hash';

/**
 * Evaluate a flag given a context
 */
export function evaluateFlag(flag: FlagDefinition, context: EvaluationContext = {}): EvaluationResult {
  const timestamp = new Date().toISOString();
  const base = { flagName: flag.name, timestamp };

  // Disabled flag
  if (flag.status !== 'active') {
    const disabledValue = flag.type === 'boolean' ? false : flag.defaultValue;
    return { ...base, value: disabledValue, reason: 'disabled' };
  }

  // Check expiry
  if (flag.expiresAt) {
    const expiry = new Date(flag.expiresAt);
    if (!isNaN(expiry.getTime()) && expiry < new Date()) {
      const disabledValue = flag.type === 'boolean' ? false : flag.defaultValue;
      return { ...base, value: disabledValue, reason: 'disabled' };
    }
  }

  // Environment match
  if (context.environment && flag.environments?.length) {
    const envConfig = flag.environments.find(e => e.name === context.environment);
    if (envConfig) {
      if (!envConfig.enabled) {
        return { ...base, value: flag.defaultValue, reason: 'disabled' };
      }
      if (envConfig.value !== undefined) {
        return { ...base, value: envConfig.value, reason: 'environment' };
      }
    }
  }

  // Rule evaluation
  if (flag.rules?.length && context.attributes) {
    for (const rule of flag.rules) {
      if (evaluateRule(rule, context.attributes)) {
        return { ...base, value: flag.type === 'boolean' ? true : flag.defaultValue, reason: 'rule' };
      }
    }
  }

  // Rollout
  if (flag.rollout && context.userId) {
    const seed = flag.rollout.seed || flag.name;
    const bucket = computeBucket(context.userId, seed);
    if (bucket < flag.rollout.percentage) {
      return { ...base, value: flag.type === 'boolean' ? true : flag.defaultValue, reason: 'rollout' };
    } else {
      return { ...base, value: flag.type === 'boolean' ? false : flag.defaultValue, reason: 'rollout' };
    }
  }

  return { ...base, value: flag.defaultValue, reason: 'default' };
}

/**
 * Evaluate a targeting rule against attributes
 */
export function evaluateRule(rule: TargetingRule, attributes: Record<string, FlagValue>): boolean {
  const attrValue = attributes[rule.attribute];
  if (attrValue === undefined) return false;

  switch (rule.operator) {
    case 'eq':
      return attrValue === rule.value;

    case 'neq':
      return attrValue !== rule.value;

    case 'in':
      if (Array.isArray(rule.value)) {
        return rule.value.includes(String(attrValue));
      }
      return false;

    case 'nin':
      if (Array.isArray(rule.value)) {
        return !rule.value.includes(String(attrValue));
      }
      return true;

    case 'gt':
      return Number(attrValue) > Number(rule.value);

    case 'lt':
      return Number(attrValue) < Number(rule.value);

    case 'gte':
      return Number(attrValue) >= Number(rule.value);

    case 'lte':
      return Number(attrValue) <= Number(rule.value);

    case 'contains':
      return String(attrValue).includes(String(rule.value));

    case 'matches':
      try {
        // Limit pattern length to mitigate ReDoS
        const pattern = String(rule.value);
        if (pattern.length > 1000) return false;
        // Use a timeout-safe approach: test with a bounded regex
        const regex = new RegExp(pattern);
        return regex.test(String(attrValue).slice(0, 10000));
      } catch {
        return false;
      }

    default:
      return false;
  }
}

/**
 * Compute a deterministic bucket (0-99) for percentage rollouts
 */
export function computeBucket(userId: string, seed: string): number {
  const hash = hashString(`${seed}:${userId}`);
  return Math.abs(hash) % 100;
}

/**
 * Batch evaluate multiple flags
 */
export function evaluateFlags(
  flags: FlagDefinition[],
  context: EvaluationContext = {}
): Map<string, EvaluationResult> {
  const results = new Map<string, EvaluationResult>();
  for (const flag of flags) {
    results.set(flag.name, evaluateFlag(flag, context));
  }
  return results;
}

/**
 * Check if a flag is enabled (convenience for boolean flags)
 */
export function isEnabled(flag: FlagDefinition, context: EvaluationContext = {}): boolean {
  const result = evaluateFlag(flag, context);
  return result.value === true;
}

/**
 * Get flag value with type assertion
 */
export function getFlagValue<T extends FlagValue>(
  flag: FlagDefinition,
  context: EvaluationContext = {}
): T {
  const result = evaluateFlag(flag, context);
  return result.value as T;
}
