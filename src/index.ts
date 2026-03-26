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
export { migrateManifest, needsMigration, hasMigrationPath } from './core/migration';
export { extractDependencies, validateDependencies, detectCycles, getDependencyTree, checkConflicts, getAffectedFlags } from './core/dependencies';
export { getTemplate, listTemplates, createFromTemplate, listTemplatesByCategory, getTemplateCategories } from './core/templates';
export { searchFlags, fuzzyMatch, buildTagIndex, buildOwnerIndex, groupBy } from './core/search';
export { discoverManifests, mergeDiscovered, findDuplicates } from './core/discovery';
export { createSnapshot, compareSnapshots, restoreFromSnapshot } from './core/snapshot';
export { FlagAnalytics } from './core/analytics';
export { scanForUsages, scanContent, generateGuardReport } from './core/guard';
export { lintManifest, getLintSummary, hasLintErrors, builtinRules } from './core/linter';
export { ContextProvider, mergeContexts } from './sdk/provider';
export { bulkEnable, bulkDisable, bulkArchive, bulkAddTag, bulkRemoveTag, bulkSetOwner, bulkDelete } from './core/bulk';
export { FlagScheduler } from './core/scheduling';
export { compareManifests, generateSyncPlan, getComparisonSummary } from './core/comparator';
export { FlagWatcher } from './sdk/watcher';
export { MiddlewarePipeline, createLoggingMiddleware, createOverrideMiddleware, createTrackingMiddleware } from './sdk/middleware';

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
