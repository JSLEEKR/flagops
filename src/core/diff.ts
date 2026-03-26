/**
 * Diff engine for comparing flag manifests
 */
import { FlagDefinition, FlagManifest, FlagChange } from './types';

export interface ManifestDiff {
  added: FlagDefinition[];
  removed: FlagDefinition[];
  modified: { flag: FlagDefinition; changes: FlagChange[] }[];
  unchanged: FlagDefinition[];
}

/**
 * Compare two manifests and return differences
 */
export function diffManifests(before: FlagManifest, after: FlagManifest): ManifestDiff {
  const result: ManifestDiff = {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  };

  const beforeMap = new Map(before.flags.map(f => [f.name, f]));
  const afterMap = new Map(after.flags.map(f => [f.name, f]));

  // Find added and modified
  for (const [name, afterFlag] of afterMap) {
    const beforeFlag = beforeMap.get(name);
    if (!beforeFlag) {
      result.added.push(afterFlag);
    } else {
      const changes = diffFlags(beforeFlag, afterFlag);
      if (changes.length > 0) {
        result.modified.push({ flag: afterFlag, changes });
      } else {
        result.unchanged.push(afterFlag);
      }
    }
  }

  // Find removed
  for (const [name, beforeFlag] of beforeMap) {
    if (!afterMap.has(name)) {
      result.removed.push(beforeFlag);
    }
  }

  return result;
}

/**
 * Compare two flag definitions and return changes
 */
export function diffFlags(before: FlagDefinition, after: FlagDefinition): FlagChange[] {
  const changes: FlagChange[] = [];
  const now = new Date().toISOString();
  const fieldsToCompare: (keyof FlagDefinition)[] = [
    'status', 'type', 'defaultValue', 'description', 'owner',
    'expiresAt',
  ];

  for (const field of fieldsToCompare) {
    const oldVal = before[field];
    const newVal = after[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        flagName: before.name,
        field,
        oldValue: oldVal,
        newValue: newVal,
        timestamp: now,
      });
    }
  }

  // Compare arrays
  if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) {
    changes.push({
      flagName: before.name,
      field: 'tags',
      oldValue: before.tags,
      newValue: after.tags,
      timestamp: now,
    });
  }

  if (JSON.stringify(before.environments) !== JSON.stringify(after.environments)) {
    changes.push({
      flagName: before.name,
      field: 'environments',
      oldValue: before.environments,
      newValue: after.environments,
      timestamp: now,
    });
  }

  if (JSON.stringify(before.rules) !== JSON.stringify(after.rules)) {
    changes.push({
      flagName: before.name,
      field: 'rules',
      oldValue: before.rules,
      newValue: after.rules,
      timestamp: now,
    });
  }

  if (JSON.stringify(before.rollout) !== JSON.stringify(after.rollout)) {
    changes.push({
      flagName: before.name,
      field: 'rollout',
      oldValue: before.rollout,
      newValue: after.rollout,
      timestamp: now,
    });
  }

  return changes;
}

/**
 * Format diff for display
 */
export function formatDiff(diff: ManifestDiff): string {
  const lines: string[] = [];

  if (diff.added.length) {
    lines.push(`Added (${diff.added.length}):`);
    for (const f of diff.added) {
      lines.push(`  + ${f.name} [${f.type}] (${f.status})`);
    }
  }

  if (diff.removed.length) {
    lines.push(`Removed (${diff.removed.length}):`);
    for (const f of diff.removed) {
      lines.push(`  - ${f.name} [${f.type}]`);
    }
  }

  if (diff.modified.length) {
    lines.push(`Modified (${diff.modified.length}):`);
    for (const { flag, changes } of diff.modified) {
      lines.push(`  ~ ${flag.name}:`);
      for (const c of changes) {
        lines.push(`      ${c.field}: ${JSON.stringify(c.oldValue)} -> ${JSON.stringify(c.newValue)}`);
      }
    }
  }

  if (diff.unchanged.length) {
    lines.push(`Unchanged: ${diff.unchanged.length} flags`);
  }

  return lines.join('\n');
}

/**
 * Check if diff has any changes
 */
export function hasChanges(diff: ManifestDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0;
}
