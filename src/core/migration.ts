/**
 * Migration support for flag manifest versions
 */
import { FlagManifest, FlagDefinition } from './types';

export interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (manifest: FlagManifest) => FlagManifest;
}

const migrations: Migration[] = [
  {
    fromVersion: '0.1',
    toVersion: '1.0',
    migrate: (manifest) => ({
      ...manifest,
      version: '1.0',
      flags: manifest.flags.map(f => ({
        ...f,
        createdAt: f.createdAt || new Date().toISOString(),
        updatedAt: f.updatedAt || new Date().toISOString(),
      })),
    }),
  },
];

/**
 * Apply migrations to bring manifest to latest version
 */
export function migrateManifest(manifest: FlagManifest, targetVersion: string = '1.0'): FlagManifest {
  let current = manifest;
  let currentVersion = manifest.version || '0.1';

  while (currentVersion !== targetVersion) {
    const migration = migrations.find(m => m.fromVersion === currentVersion);
    if (!migration) break;
    current = migration.migrate(current);
    currentVersion = migration.toVersion;
  }

  return current;
}

/**
 * Check if manifest needs migration
 */
export function needsMigration(manifest: FlagManifest, targetVersion: string = '1.0'): boolean {
  return manifest.version !== targetVersion;
}

/**
 * Get available migrations
 */
export function getAvailableMigrations(): Migration[] {
  return [...migrations];
}

/**
 * Create a backup of the manifest before migration
 */
export function createBackup(manifest: FlagManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * Validate migration path exists
 */
export function hasMigrationPath(fromVersion: string, toVersion: string): boolean {
  let current = fromVersion;
  const visited = new Set<string>();

  while (current !== toVersion) {
    if (visited.has(current)) return false;
    visited.add(current);
    const migration = migrations.find(m => m.fromVersion === current);
    if (!migration) return false;
    current = migration.toVersion;
  }

  return true;
}
