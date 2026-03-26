/**
 * flagops — Git-native feature flags with zero infrastructure
 */
export { FlagStore } from './core/store';
export { FlagOpsClient, createClient } from './sdk/client';
export { evaluateFlag, evaluateFlags, isEnabled, getFlagValue, evaluateRule, computeBucket } from './core/evaluator';
export { parseYaml, parseJson, toYaml, toJson, validateManifest, validateFlag, normalizeManifest, normalizeFlag, parseContent, detectFormat } from './core/parser';
export { exportFlags, toEnvFormat, toCsvFormat, generateTypeDefinition } from './core/exporter';
export { diffManifests, diffFlags, formatDiff, hasChanges } from './core/diff';
export { LifecycleHooks } from './hooks/lifecycle';
export { parseRuleExpression, serializeRule, evaluateComposite, createSegmentRule, createScheduleRule } from './rules/engine';
export { hashString, hashRange, generateId } from './utils/hash';
export { isGitRepo, getGitInfo } from './utils/git';

export type {
  FlagValue,
  FlagStatus,
  EnvironmentConfig,
  TargetingRule,
  RolloutConfig,
  FlagDefinition,
  FlagManifest,
  EvaluationContext,
  EvaluationResult,
  FlagChange,
  AuditEntry,
  ValidationError,
  FlagStats,
  FlagFilter,
  ExportFormat,
  GitInfo,
} from './core/types';
