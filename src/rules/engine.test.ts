import { evaluateComposite, parseRuleExpression, serializeRule, createScheduleRule, createSegmentRule, CompositeRule } from './engine';

describe('Rule Engine', () => {
  describe('evaluateComposite', () => {
    it('should evaluate AND rules', () => {
      const rule: CompositeRule = {
        operator: 'and',
        rules: [
          { attribute: 'country', operator: 'eq', value: 'US' },
          { attribute: 'age', operator: 'gt', value: 18 },
        ],
      };
      expect(evaluateComposite(rule, { country: 'US', age: 25 })).toBe(true);
      expect(evaluateComposite(rule, { country: 'US', age: 15 })).toBe(false);
    });

    it('should evaluate OR rules', () => {
      const rule: CompositeRule = {
        operator: 'or',
        rules: [
          { attribute: 'role', operator: 'eq', value: 'admin' },
          { attribute: 'role', operator: 'eq', value: 'editor' },
        ],
      };
      expect(evaluateComposite(rule, { role: 'admin' })).toBe(true);
      expect(evaluateComposite(rule, { role: 'viewer' })).toBe(false);
    });

    it('should handle nested composite rules', () => {
      const rule: CompositeRule = {
        operator: 'and',
        rules: [
          { attribute: 'active', operator: 'eq', value: true },
          {
            operator: 'or',
            rules: [
              { attribute: 'plan', operator: 'eq', value: 'pro' },
              { attribute: 'plan', operator: 'eq', value: 'enterprise' },
            ],
          } as CompositeRule,
        ],
      };
      expect(evaluateComposite(rule, { active: true, plan: 'pro' })).toBe(true);
      expect(evaluateComposite(rule, { active: false, plan: 'pro' })).toBe(false);
    });
  });

  describe('parseRuleExpression', () => {
    it('should parse eq expression', () => {
      const rule = parseRuleExpression('country eq US');
      expect(rule.attribute).toBe('country');
      expect(rule.operator).toBe('eq');
      expect(rule.value).toBe('US');
    });

    it('should parse gt with number', () => {
      const rule = parseRuleExpression('age gt 18');
      expect(rule.value).toBe(18);
    });

    it('should parse in with list', () => {
      const rule = parseRuleExpression('role in admin,editor');
      expect(rule.operator).toBe('in');
      expect(rule.value).toEqual(['admin', 'editor']);
    });

    it('should parse boolean values', () => {
      const rule = parseRuleExpression('active eq true');
      expect(rule.value).toBe(true);
    });

    it('should parse false value', () => {
      const rule = parseRuleExpression('disabled eq false');
      expect(rule.value).toBe(false);
    });

    it('should throw on invalid expression', () => {
      expect(() => parseRuleExpression('invalid')).toThrow();
    });

    it('should throw on invalid operator', () => {
      expect(() => parseRuleExpression('x invalid y')).toThrow('Invalid operator');
    });

    it('should handle multi-word values', () => {
      const rule = parseRuleExpression('name contains John Doe');
      expect(rule.value).toBe('John Doe');
    });
  });

  describe('serializeRule', () => {
    it('should serialize simple rule', () => {
      expect(serializeRule({ attribute: 'x', operator: 'eq', value: 'y' })).toBe('x eq y');
    });

    it('should serialize array value', () => {
      expect(serializeRule({ attribute: 'x', operator: 'in', value: ['a', 'b'] })).toBe('x in a,b');
    });
  });

  describe('createScheduleRule', () => {
    it('should create start rule', () => {
      const rules = createScheduleRule('2024-01-01');
      expect(rules).toHaveLength(1);
      expect(rules[0].operator).toBe('gte');
    });

    it('should create start and end rules', () => {
      const rules = createScheduleRule('2024-01-01', '2024-12-31');
      expect(rules).toHaveLength(2);
    });

    it('should create no rules for no dates', () => {
      const rules = createScheduleRule();
      expect(rules).toHaveLength(0);
    });
  });

  describe('createSegmentRule', () => {
    it('should create segment rule', () => {
      const rule = createSegmentRule('plan', ['pro', 'enterprise']);
      expect(rule.operator).toBe('in');
      expect(rule.value).toEqual(['pro', 'enterprise']);
    });
  });
});
