/**
 * Flag comparator — compare flag configurations between environments/branches
 */
import { FlagManifest, FlagDefinition } from './types';

export interface ComparisonEntry {
  flagName: string;
  fieldName: string;
  sourceValue: unknown;
  targetValue: unknown;
}

export interface ComparisonResult {
  sourceOnly: string[];
  targetOnly: string[];
  differences: ComparisonEntry[];
  identical: string[];
}

/**
 * Compare two manifests field by field
 */
export function compareManifests(
  source: FlagManifest,
  target: FlagManifest,
  fields?: (keyof FlagDefinition)[]
): ComparisonResult {
  const compareFields = fields || ['status', 'type', 'defaultValue', 'description', 'rollout', 'environments', 'rules'];

  const sourceMap = new Map(source.flags.map(f => [f.name, f]));
  const targetMap = new Map(target.flags.map(f => [f.name, f]));

  const sourceOnly: string[] = [];
  const targetOnly: string[] = [];
  const differences: ComparisonEntry[] = [];
  const identical: string[] = [];

  // Source-only flags
  for (const name of sourceMap.keys()) {
    if (!targetMap.has(name)) sourceOnly.push(name);
  }

  // Target-only flags
  for (const name of targetMap.keys()) {
    if (!sourceMap.has(name)) targetOnly.push(name);
  }

  // Compare shared flags
  for (const [name, sourceFlag] of sourceMap) {
    const targetFlag = targetMap.get(name);
    if (!targetFlag) continue;

    let hasDiff = false;
    for (const field of compareFields) {
      const sv = sourceFlag[field];
      const tv = targetFlag[field];
      if (JSON.stringify(sv) !== JSON.stringify(tv)) {
        differences.push({
          flagName: name,
          fieldName: field,
          sourceValue: sv,
          targetValue: tv,
        });
        hasDiff = true;
      }
    }

    if (!hasDiff) identical.push(name);
  }

  return { sourceOnly, targetOnly, differences, identical };
}

/**
 * Generate a sync plan to make target match source
 */
export function generateSyncPlan(comparison: ComparisonResult): SyncAction[] {
  const actions: SyncAction[] = [];

  for (const name of comparison.sourceOnly) {
    actions.push({ type: 'add', flagName: name });
  }

  for (const name of comparison.targetOnly) {
    actions.push({ type: 'remove', flagName: name });
  }

  const modifiedFlags = new Set(comparison.differences.map(d => d.flagName));
  for (const name of modifiedFlags) {
    actions.push({ type: 'update', flagName: name });
  }

  return actions;
}

export interface SyncAction {
  type: 'add' | 'remove' | 'update';
  flagName: string;
}

/**
 * Get a summary of comparison
 */
export function getComparisonSummary(result: ComparisonResult): string {
  const lines: string[] = [];
  lines.push(`Source only: ${result.sourceOnly.length}`);
  lines.push(`Target only: ${result.targetOnly.length}`);
  lines.push(`Differences: ${new Set(result.differences.map(d => d.flagName)).size} flags`);
  lines.push(`Identical: ${result.identical.length}`);
  return lines.join('\n');
}
