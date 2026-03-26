/**
 * Flag templates — predefined flag configurations for common patterns
 */
import { FlagDefinition } from './types';

export interface FlagTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  create: (flagName: string, options?: Record<string, unknown>) => FlagDefinition;
}

const now = () => new Date().toISOString();

export const builtinTemplates: FlagTemplate[] = [
  {
    id: 'kill-switch',
    name: 'Kill Switch',
    description: 'Emergency flag to disable a feature instantly',
    category: 'operations',
    create: (name, opts) => ({
      name,
      description: (opts?.description as string) || `Kill switch for ${name}`,
      status: 'active',
      type: 'boolean',
      defaultValue: true,
      tags: ['kill-switch', 'ops'],
      createdAt: now(),
      updatedAt: now(),
    }),
  },
  {
    id: 'gradual-rollout',
    name: 'Gradual Rollout',
    description: 'Progressive percentage-based feature rollout',
    category: 'release',
    create: (name, opts) => ({
      name,
      description: (opts?.description as string) || `Gradual rollout: ${name}`,
      status: 'active',
      type: 'boolean',
      defaultValue: false,
      rollout: {
        percentage: (opts?.percentage as number) || 10,
        seed: name,
      },
      tags: ['rollout', 'gradual'],
      createdAt: now(),
      updatedAt: now(),
    }),
  },
  {
    id: 'ab-test',
    name: 'A/B Test',
    description: 'Two-variant experiment flag',
    category: 'experiment',
    create: (name, opts) => ({
      name,
      description: (opts?.description as string) || `A/B test: ${name}`,
      status: 'active',
      type: 'multivariate',
      defaultValue: ['control', 'variant'],
      rollout: {
        percentage: 50,
        seed: name,
      },
      tags: ['experiment', 'ab-test'],
      expiresAt: (opts?.expiresAt as string) || undefined,
      createdAt: now(),
      updatedAt: now(),
    }),
  },
  {
    id: 'environment-gate',
    name: 'Environment Gate',
    description: 'Flag enabled only in specific environments',
    category: 'release',
    create: (name, opts) => {
      const envs = (opts?.environments as string[]) || ['staging'];
      return {
        name,
        description: (opts?.description as string) || `Environment gate: ${name}`,
        status: 'active',
        type: 'boolean',
        defaultValue: false,
        environments: envs.map(e => ({ name: e, enabled: true, value: true })),
        tags: ['env-gate'],
        createdAt: now(),
        updatedAt: now(),
      };
    },
  },
  {
    id: 'temporary',
    name: 'Temporary Flag',
    description: 'Short-lived flag with automatic expiration',
    category: 'operations',
    create: (name, opts) => {
      const days = (opts?.daysUntilExpiry as number) || 30;
      const expiry = new Date(Date.now() + days * 86400000).toISOString();
      return {
        name,
        description: (opts?.description as string) || `Temporary flag (expires in ${days} days)`,
        status: 'active',
        type: 'boolean',
        defaultValue: true,
        expiresAt: expiry,
        tags: ['temporary'],
        createdAt: now(),
        updatedAt: now(),
      };
    },
  },
  {
    id: 'config-value',
    name: 'Config Value',
    description: 'Runtime configuration value',
    category: 'config',
    create: (name, opts) => ({
      name,
      description: (opts?.description as string) || `Config: ${name}`,
      status: 'active',
      type: (opts?.type as FlagDefinition['type']) || 'string',
      defaultValue: (opts?.defaultValue as FlagDefinition['defaultValue']) ?? '',
      tags: ['config'],
      createdAt: now(),
      updatedAt: now(),
    }),
  },
];

/**
 * Get a template by ID
 */
export function getTemplate(id: string): FlagTemplate | undefined {
  return builtinTemplates.find(t => t.id === id);
}

/**
 * List all templates
 */
export function listTemplates(): FlagTemplate[] {
  return [...builtinTemplates];
}

/**
 * List templates by category
 */
export function listTemplatesByCategory(category: string): FlagTemplate[] {
  return builtinTemplates.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): string[] {
  return [...new Set(builtinTemplates.map(t => t.category))];
}

/**
 * Create a flag from a template
 */
export function createFromTemplate(
  templateId: string,
  flagName: string,
  options?: Record<string, unknown>
): FlagDefinition {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }
  return template.create(flagName, options);
}
