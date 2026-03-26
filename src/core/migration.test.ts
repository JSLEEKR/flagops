import { migrateManifest, needsMigration, hasMigrationPath, createBackup, getAvailableMigrations } from './migration';
import { FlagManifest } from './types';

describe('Migration', () => {
  const oldManifest: FlagManifest = {
    version: '0.1',
    flags: [
      {
        name: 'old-flag',
        status: 'active',
        type: 'boolean',
        defaultValue: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
  };

  describe('migrateManifest', () => {
    it('should migrate from 0.1 to 1.0', () => {
      const result = migrateManifest(oldManifest, '1.0');
      expect(result.version).toBe('1.0');
      expect(result.flags[0].createdAt).toBeTruthy();
    });

    it('should not modify already current manifest', () => {
      const current: FlagManifest = { version: '1.0', flags: [] };
      const result = migrateManifest(current, '1.0');
      expect(result.version).toBe('1.0');
    });
  });

  describe('needsMigration', () => {
    it('should return true for old version', () => {
      expect(needsMigration(oldManifest)).toBe(true);
    });

    it('should return false for current version', () => {
      expect(needsMigration({ version: '1.0', flags: [] })).toBe(false);
    });
  });

  describe('hasMigrationPath', () => {
    it('should find path from 0.1 to 1.0', () => {
      expect(hasMigrationPath('0.1', '1.0')).toBe(true);
    });

    it('should return false for unknown path', () => {
      expect(hasMigrationPath('0.0', '1.0')).toBe(false);
    });

    it('should return true for same version', () => {
      expect(hasMigrationPath('1.0', '1.0')).toBe(true);
    });
  });

  describe('createBackup', () => {
    it('should create JSON backup', () => {
      const backup = createBackup(oldManifest);
      const parsed = JSON.parse(backup);
      expect(parsed.version).toBe('0.1');
    });
  });

  describe('getAvailableMigrations', () => {
    it('should return migrations array', () => {
      const migrations = getAvailableMigrations();
      expect(migrations.length).toBeGreaterThan(0);
    });
  });
});
