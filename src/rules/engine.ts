/**
 * Advanced rule engine for complex flag evaluation
 */
import { TargetingRule, FlagValue } from '../core/types';
import { evaluateRule } from '../core/evaluator';

/** Composite rule with AND/OR logic */
export interface CompositeRule {
  operator: 'and' | 'or';
  rules: (TargetingRule | CompositeRule)[];
}

/**
 * Evaluate a composite rule tree
 */
export function evaluateComposite(
  rule: CompositeRule,
  attributes: Record<string, FlagValue>
): boolean {
  if (rule.operator === 'and') {
    return rule.rules.every(r => evaluateNode(r, attributes));
  }
  return rule.rules.some(r => evaluateNode(r, attributes));
}

function evaluateNode(
  node: TargetingRule | CompositeRule,
  attributes: Record<string, FlagValue>
): boolean {
  if ('operator' in node && ('rules' in node)) {
    if (node.operator === 'and' || node.operator === 'or') {
      return evaluateComposite(node as CompositeRule, attributes);
    }
  }
  return evaluateRule(node as TargetingRule, attributes);
}

/**
 * Build a rule from a simple expression string
 * Format: "attribute operator value"
 * Examples: "country eq US", "age gt 18", "role in admin,editor"
 */
export function parseRuleExpression(expr: string): TargetingRule {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 3) {
    throw new Error(`Invalid rule expression: ${expr}`);
  }

  const attribute = parts[0];
  const operator = parts[1] as TargetingRule['operator'];
  const rawValue = parts.slice(2).join(' ');

  const validOps = ['eq', 'neq', 'in', 'nin', 'gt', 'lt', 'gte', 'lte', 'contains', 'matches'];
  if (!validOps.includes(operator)) {
    throw new Error(`Invalid operator: ${operator}`);
  }

  let value: FlagValue;
  if (operator === 'in' || operator === 'nin') {
    value = rawValue.split(',').map(v => v.trim());
  } else if (!isNaN(Number(rawValue))) {
    value = Number(rawValue);
  } else if (rawValue === 'true') {
    value = true;
  } else if (rawValue === 'false') {
    value = false;
  } else {
    value = rawValue;
  }

  return { attribute, operator, value };
}

/**
 * Serialize a rule to expression string
 */
export function serializeRule(rule: TargetingRule): string {
  const value = Array.isArray(rule.value) ? rule.value.join(',') : String(rule.value);
  return `${rule.attribute} ${rule.operator} ${value}`;
}

/**
 * Create a schedule-based rule for time-based flag activation
 */
export function createScheduleRule(
  startDate?: string,
  endDate?: string
): TargetingRule[] {
  const rules: TargetingRule[] = [];

  if (startDate) {
    rules.push({
      attribute: '_timestamp',
      operator: 'gte',
      value: startDate,
    });
  }

  if (endDate) {
    rules.push({
      attribute: '_timestamp',
      operator: 'lte',
      value: endDate,
    });
  }

  return rules;
}

/**
 * Create a user segment rule
 */
export function createSegmentRule(
  attribute: string,
  values: string[]
): TargetingRule {
  return {
    attribute,
    operator: 'in',
    value: values,
  };
}
