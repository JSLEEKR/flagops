import { getTemplate, listTemplates, listTemplatesByCategory, getTemplateCategories, createFromTemplate } from './templates';

describe('Templates', () => {
  describe('listTemplates', () => {
    it('should return all builtin templates', () => {
      const templates = listTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('getTemplate', () => {
    it('should find kill-switch template', () => {
      const t = getTemplate('kill-switch');
      expect(t).toBeDefined();
      expect(t!.name).toBe('Kill Switch');
    });

    it('should return undefined for unknown template', () => {
      expect(getTemplate('nonexistent')).toBeUndefined();
    });
  });

  describe('createFromTemplate', () => {
    it('should create kill-switch flag', () => {
      const flag = createFromTemplate('kill-switch', 'api-kill');
      expect(flag.name).toBe('api-kill');
      expect(flag.defaultValue).toBe(true);
      expect(flag.tags).toContain('kill-switch');
    });

    it('should create gradual-rollout flag', () => {
      const flag = createFromTemplate('gradual-rollout', 'new-ui', { percentage: 25 });
      expect(flag.rollout?.percentage).toBe(25);
      expect(flag.tags).toContain('rollout');
    });

    it('should create ab-test flag', () => {
      const flag = createFromTemplate('ab-test', 'cta-test');
      expect(flag.type).toBe('multivariate');
      expect(flag.rollout?.percentage).toBe(50);
    });

    it('should create environment-gate flag', () => {
      const flag = createFromTemplate('environment-gate', 'staging-only', {
        environments: ['staging', 'dev'],
      });
      expect(flag.environments).toHaveLength(2);
    });

    it('should create temporary flag with expiry', () => {
      const flag = createFromTemplate('temporary', 'short-lived', { daysUntilExpiry: 7 });
      expect(flag.expiresAt).toBeDefined();
    });

    it('should create config-value flag', () => {
      const flag = createFromTemplate('config-value', 'rate-limit', {
        type: 'number',
        defaultValue: 100,
      });
      expect(flag.type).toBe('number');
      expect(flag.defaultValue).toBe(100);
    });

    it('should throw for unknown template', () => {
      expect(() => createFromTemplate('unknown', 'test')).toThrow('not found');
    });
  });

  describe('listTemplatesByCategory', () => {
    it('should filter by category', () => {
      const ops = listTemplatesByCategory('operations');
      expect(ops.length).toBeGreaterThan(0);
      expect(ops.every(t => t.category === 'operations')).toBe(true);
    });

    it('should return empty for unknown category', () => {
      expect(listTemplatesByCategory('nonexistent')).toHaveLength(0);
    });
  });

  describe('getTemplateCategories', () => {
    it('should return unique categories', () => {
      const cats = getTemplateCategories();
      expect(cats.length).toBeGreaterThan(0);
      expect(new Set(cats).size).toBe(cats.length);
    });
  });
});
