import { createSnapshot, compareSnapshots, restoreFromSnapshot, serializeSnapshots, deserializeSnapshots } from './snapshot';
import { FlagManifest } from './types';

describe('Snapshot', () => {
  const manifest: FlagManifest = {
    version: '1.0',
    flags: [
      { name: 'a', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' },
      { name: 'b', status: 'inactive', type: 'string', defaultValue: 'hello', createdAt: '2024', updatedAt: '2024' },
    ],
  };

  describe('createSnapshot', () => {
    it('should create snapshot with id and timestamp', () => {
      const snap = createSnapshot(manifest, 'test snapshot');
      expect(snap.id).toMatch(/^snap_/);
      expect(snap.timestamp).toBeDefined();
      expect(snap.description).toBe('test snapshot');
    });

    it('should deep copy manifest', () => {
      const snap = createSnapshot(manifest);
      manifest.flags[0].status = 'archived';
      expect(snap.manifest.flags[0].status).toBe('active');
      manifest.flags[0].status = 'active'; // restore
    });

    it('should include metadata', () => {
      const snap = createSnapshot(manifest, undefined, { branch: 'main' });
      expect(snap.metadata?.branch).toBe('main');
    });
  });

  describe('compareSnapshots', () => {
    it('should detect added flags', () => {
      const snap1 = createSnapshot({ version: '1.0', flags: [] });
      const snap2 = createSnapshot(manifest);
      const diff = compareSnapshots(snap1, snap2);
      expect(diff.added).toContain('a');
      expect(diff.added).toContain('b');
    });

    it('should detect removed flags', () => {
      const snap1 = createSnapshot(manifest);
      const snap2 = createSnapshot({ version: '1.0', flags: [] });
      const diff = compareSnapshots(snap1, snap2);
      expect(diff.removed).toContain('a');
    });

    it('should detect modified flags', () => {
      const modified = { ...manifest, flags: [{ ...manifest.flags[0], status: 'inactive' as const }, manifest.flags[1]] };
      const snap1 = createSnapshot(manifest);
      const snap2 = createSnapshot(modified);
      const diff = compareSnapshots(snap1, snap2);
      expect(diff.modified).toContain('a');
    });

    it('should show no changes for identical', () => {
      const snap1 = createSnapshot(manifest);
      const snap2 = createSnapshot(manifest);
      const diff = compareSnapshots(snap1, snap2);
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
    });
  });

  describe('restoreFromSnapshot', () => {
    it('should return deep copy of manifest', () => {
      const snap = createSnapshot(manifest);
      const restored = restoreFromSnapshot(snap);
      expect(restored.flags).toHaveLength(2);
      restored.flags.push({ name: 'c', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' });
      expect(snap.manifest.flags).toHaveLength(2);
    });
  });

  describe('serialize/deserialize', () => {
    it('should roundtrip snapshots', () => {
      const snaps = [createSnapshot(manifest, 'first'), createSnapshot(manifest, 'second')];
      const json = serializeSnapshots(snaps);
      const restored = deserializeSnapshots(json);
      expect(restored).toHaveLength(2);
      expect(restored[0].description).toBe('first');
    });
  });
});
