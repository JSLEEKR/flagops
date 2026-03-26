/**
 * Snapshot — capture and restore flag states at a point in time
 */
import { FlagManifest, FlagDefinition } from './types';

export interface Snapshot {
  id: string;
  timestamp: string;
  description?: string;
  manifest: FlagManifest;
  metadata?: Record<string, string>;
}

/**
 * Create a snapshot of the current manifest state
 */
export function createSnapshot(
  manifest: FlagManifest,
  description?: string,
  metadata?: Record<string, string>
): Snapshot {
  return {
    id: generateSnapshotId(),
    timestamp: new Date().toISOString(),
    description,
    manifest: JSON.parse(JSON.stringify(manifest)),
    metadata,
  };
}

/**
 * Compare two snapshots
 */
export function compareSnapshots(a: Snapshot, b: Snapshot): SnapshotDiff {
  const aFlags = new Map(a.manifest.flags.map(f => [f.name, f]));
  const bFlags = new Map(b.manifest.flags.map(f => [f.name, f]));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  for (const name of bFlags.keys()) {
    if (!aFlags.has(name)) added.push(name);
    else if (JSON.stringify(aFlags.get(name)) !== JSON.stringify(bFlags.get(name))) {
      modified.push(name);
    }
  }

  for (const name of aFlags.keys()) {
    if (!bFlags.has(name)) removed.push(name);
  }

  return { added, removed, modified, fromId: a.id, toId: b.id };
}

export interface SnapshotDiff {
  added: string[];
  removed: string[];
  modified: string[];
  fromId: string;
  toId: string;
}

/**
 * Restore a manifest from a snapshot
 */
export function restoreFromSnapshot(snapshot: Snapshot): FlagManifest {
  return JSON.parse(JSON.stringify(snapshot.manifest));
}

/**
 * Serialize snapshots for storage
 */
export function serializeSnapshots(snapshots: Snapshot[]): string {
  return JSON.stringify(snapshots, null, 2);
}

/**
 * Deserialize snapshots from storage
 */
export function deserializeSnapshots(data: string): Snapshot[] {
  return JSON.parse(data);
}

function generateSnapshotId(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}
