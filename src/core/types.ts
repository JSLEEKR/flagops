/**
 * Core types for flagops feature flag system
 */

/** Supported flag value types */
export type FlagValue = boolean | string | number | string[];

/** Flag status */
export type FlagStatus = 'active' | 'inactive' | 'archived';

/** Environment targeting */
export interface EnvironmentConfig {
  name: string;
  enabled: boolean;
  value?: FlagValue;
}

/** User/group targeting rule */
export interface TargetingRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches';
  value: FlagValue;
}

/** Percentage rollout config */
export interface RolloutConfig {
  percentage: number;
  seed?: string;
}

/** A single feature flag definition */
export interface FlagDefinition {
  name: string;
  description?: string;
  status: FlagStatus;
  type: 'boolean' | 'string' | 'number' | 'multivariate';
  defaultValue: FlagValue;
  environments?: EnvironmentConfig[];
  rules?: TargetingRule[];
  rollout?: RolloutConfig;
  tags?: string[];
  owner?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

/** A flagops manifest file */
export interface FlagManifest {
  version: string;
  namespace?: string;
  flags: FlagDefinition[];
}

/** Evaluation context passed when checking a flag */
export interface EvaluationContext {
  environment?: string;
  userId?: string;
  attributes?: Record<string, FlagValue>;
}

/** Result of evaluating a flag */
export interface EvaluationResult {
  flagName: string;
  value: FlagValue;
  reason: 'default' | 'environment' | 'rule' | 'rollout' | 'disabled' | 'not-found';
  timestamp: string;
}

/** Flag change event */
export interface FlagChange {
  flagName: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
}

/** Audit log entry */
export interface AuditEntry {
  action: 'create' | 'update' | 'delete' | 'toggle' | 'archive';
  flagName: string;
  changes: FlagChange[];
  author?: string;
  timestamp: string;
  commitHash?: string;
}

/** Validation error */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/** Flag statistics */
export interface FlagStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  expired: number;
  byType: Record<string, number>;
  byTag: Record<string, number>;
}

/** Search/filter options */
export interface FlagFilter {
  status?: FlagStatus;
  type?: string;
  tag?: string;
  owner?: string;
  environment?: string;
  search?: string;
}

/** Export format */
export type ExportFormat = 'yaml' | 'json' | 'env' | 'csv';

/** Git integration info */
export interface GitInfo {
  branch: string;
  commitHash: string;
  author: string;
  timestamp: string;
}
