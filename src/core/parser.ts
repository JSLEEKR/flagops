/**
 * Parser for flagops manifest files (YAML/JSON)
 */
import * as yaml from 'yaml';
import { FlagManifest, FlagDefinition, ValidationError } from './types';

const CURRENT_VERSION = '1.0';

/**
 * Parse a YAML string into a FlagManifest
 */
export function parseYaml(content: string): FlagManifest {
  const parsed = yaml.parse(content);
  return normalizeManifest(parsed);
}

/**
 * Parse a JSON string into a FlagManifest
 */
export function parseJson(content: string): FlagManifest {
  const parsed = JSON.parse(content);
  return normalizeManifest(parsed);
}

/**
 * Serialize a FlagManifest to YAML
 */
export function toYaml(manifest: FlagManifest): string {
  return yaml.stringify(manifest, { indent: 2, lineWidth: 120 });
}

/**
 * Serialize a FlagManifest to JSON
 */
export function toJson(manifest: FlagManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Normalize raw parsed data into a proper FlagManifest
 */
export function normalizeManifest(raw: unknown): FlagManifest {
  if (!raw || typeof raw !== 'object') {
    return { version: CURRENT_VERSION, flags: [] };
  }

  const obj = raw as Record<string, unknown>;

  const manifest: FlagManifest = {
    version: typeof obj.version === 'string' ? obj.version : CURRENT_VERSION,
    flags: [],
  };

  if (typeof obj.namespace === 'string') {
    manifest.namespace = obj.namespace;
  }

  if (Array.isArray(obj.flags)) {
    manifest.flags = obj.flags.map(normalizeFlag).filter(Boolean) as FlagDefinition[];
  }

  return manifest;
}

/**
 * Normalize a raw flag object into a FlagDefinition
 */
export function normalizeFlag(raw: unknown): FlagDefinition | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== 'string' || !obj.name.trim()) return null;

  const now = new Date().toISOString();

  const flag: FlagDefinition = {
    name: obj.name.trim(),
    status: isValidStatus(obj.status) ? obj.status : 'inactive',
    type: isValidType(obj.type) ? obj.type : 'boolean',
    defaultValue: obj.defaultValue !== undefined ? obj.defaultValue as FlagDefinition['defaultValue'] : false,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : now,
  };

  if (typeof obj.description === 'string') flag.description = obj.description;
  if (typeof obj.owner === 'string') flag.owner = obj.owner;
  if (typeof obj.expiresAt === 'string') flag.expiresAt = obj.expiresAt;
  if (Array.isArray(obj.tags)) flag.tags = obj.tags.filter((t): t is string => typeof t === 'string');
  if (Array.isArray(obj.environments)) flag.environments = obj.environments;
  if (Array.isArray(obj.rules)) flag.rules = obj.rules;
  if (obj.rollout && typeof obj.rollout === 'object') flag.rollout = obj.rollout as FlagDefinition['rollout'];

  return flag;
}

function isValidStatus(v: unknown): v is FlagDefinition['status'] {
  return v === 'active' || v === 'inactive' || v === 'archived';
}

function isValidType(v: unknown): v is FlagDefinition['type'] {
  return v === 'boolean' || v === 'string' || v === 'number' || v === 'multivariate';
}

/**
 * Validate a FlagManifest and return errors
 */
export function validateManifest(manifest: FlagManifest): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!manifest.version) {
    errors.push({ field: 'version', message: 'Version is required', severity: 'error' });
  }

  const names = new Set<string>();
  for (const flag of manifest.flags) {
    const flagErrors = validateFlag(flag);
    errors.push(...flagErrors);

    if (names.has(flag.name)) {
      errors.push({
        field: `flags.${flag.name}`,
        message: `Duplicate flag name: ${flag.name}`,
        severity: 'error',
      });
    }
    names.add(flag.name);
  }

  return errors;
}

/**
 * Validate a single FlagDefinition
 */
export function validateFlag(flag: FlagDefinition): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `flags.${flag.name}`;

  if (!flag.name || !/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(flag.name)) {
    errors.push({
      field: `${prefix}.name`,
      message: 'Flag name must start with a letter and contain only alphanumeric, underscore, dot, or dash',
      severity: 'error',
    });
  }

  if (flag.type === 'boolean' && typeof flag.defaultValue !== 'boolean') {
    errors.push({
      field: `${prefix}.defaultValue`,
      message: 'Boolean flag must have a boolean default value',
      severity: 'warning',
    });
  }

  if (flag.type === 'number' && typeof flag.defaultValue !== 'number') {
    errors.push({
      field: `${prefix}.defaultValue`,
      message: 'Number flag must have a numeric default value',
      severity: 'warning',
    });
  }

  if (flag.rollout) {
    if (flag.rollout.percentage < 0 || flag.rollout.percentage > 100) {
      errors.push({
        field: `${prefix}.rollout.percentage`,
        message: 'Rollout percentage must be between 0 and 100',
        severity: 'error',
      });
    }
  }

  if (flag.expiresAt) {
    const expiry = new Date(flag.expiresAt);
    if (isNaN(expiry.getTime())) {
      errors.push({
        field: `${prefix}.expiresAt`,
        message: 'Invalid expiration date format',
        severity: 'error',
      });
    }
  }

  if (flag.rules) {
    for (let i = 0; i < flag.rules.length; i++) {
      const rule = flag.rules[i];
      if (!rule.attribute) {
        errors.push({
          field: `${prefix}.rules[${i}].attribute`,
          message: 'Rule attribute is required',
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

/**
 * Detect format from file extension
 */
export function detectFormat(filePath: string): 'yaml' | 'json' {
  if (filePath.endsWith('.json')) return 'json';
  return 'yaml';
}

/**
 * Parse content based on detected format
 */
export function parseContent(content: string, format: 'yaml' | 'json'): FlagManifest {
  return format === 'json' ? parseJson(content) : parseYaml(content);
}
