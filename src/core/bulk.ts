/**
 * Bulk operations for managing multiple flags at once
 */
import { FlagDefinition, FlagStatus, FlagManifest } from './types';

export interface BulkResult {
  successful: string[];
  failed: { name: string; error: string }[];
  total: number;
}

/**
 * Bulk enable flags
 */
export function bulkEnable(flags: FlagDefinition[], names: string[]): BulkResult {
  return bulkSetStatus(flags, names, 'active');
}

/**
 * Bulk disable flags
 */
export function bulkDisable(flags: FlagDefinition[], names: string[]): BulkResult {
  return bulkSetStatus(flags, names, 'inactive');
}

/**
 * Bulk archive flags
 */
export function bulkArchive(flags: FlagDefinition[], names: string[]): BulkResult {
  return bulkSetStatus(flags, names, 'archived');
}

/**
 * Bulk set status
 */
export function bulkSetStatus(
  flags: FlagDefinition[],
  names: string[],
  status: FlagStatus
): BulkResult {
  const result: BulkResult = { successful: [], failed: [], total: names.length };

  for (const name of names) {
    const flag = flags.find(f => f.name === name);
    if (!flag) {
      result.failed.push({ name, error: `Flag '${name}' not found` });
    } else {
      flag.status = status;
      flag.updatedAt = new Date().toISOString();
      result.successful.push(name);
    }
  }

  return result;
}

/**
 * Bulk add tag
 */
export function bulkAddTag(flags: FlagDefinition[], names: string[], tag: string): BulkResult {
  const result: BulkResult = { successful: [], failed: [], total: names.length };

  for (const name of names) {
    const flag = flags.find(f => f.name === name);
    if (!flag) {
      result.failed.push({ name, error: `Flag '${name}' not found` });
    } else {
      if (!flag.tags) flag.tags = [];
      if (!flag.tags.includes(tag)) {
        flag.tags.push(tag);
      }
      result.successful.push(name);
    }
  }

  return result;
}

/**
 * Bulk remove tag
 */
export function bulkRemoveTag(flags: FlagDefinition[], names: string[], tag: string): BulkResult {
  const result: BulkResult = { successful: [], failed: [], total: names.length };

  for (const name of names) {
    const flag = flags.find(f => f.name === name);
    if (!flag) {
      result.failed.push({ name, error: `Flag '${name}' not found` });
    } else {
      if (flag.tags) {
        flag.tags = flag.tags.filter(t => t !== tag);
      }
      result.successful.push(name);
    }
  }

  return result;
}

/**
 * Bulk set owner
 */
export function bulkSetOwner(flags: FlagDefinition[], names: string[], owner: string): BulkResult {
  const result: BulkResult = { successful: [], failed: [], total: names.length };

  for (const name of names) {
    const flag = flags.find(f => f.name === name);
    if (!flag) {
      result.failed.push({ name, error: `Flag '${name}' not found` });
    } else {
      flag.owner = owner;
      result.successful.push(name);
    }
  }

  return result;
}

/**
 * Bulk delete flags
 */
export function bulkDelete(manifest: FlagManifest, names: string[]): BulkResult {
  const result: BulkResult = { successful: [], failed: [], total: names.length };
  const nameSet = new Set(names);

  for (const name of names) {
    if (manifest.flags.some(f => f.name === name)) {
      result.successful.push(name);
    } else {
      result.failed.push({ name, error: `Flag '${name}' not found` });
    }
  }

  manifest.flags = manifest.flags.filter(f => !nameSet.has(f.name));
  return result;
}
