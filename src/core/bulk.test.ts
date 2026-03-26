import { bulkEnable, bulkDisable, bulkArchive, bulkAddTag, bulkRemoveTag, bulkSetOwner, bulkDelete } from './bulk';
import { FlagDefinition, FlagManifest } from './types';

describe('Bulk Operations', () => {
  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'inactive',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  });

  describe('bulkEnable', () => {
    it('should enable multiple flags', () => {
      const flags = [makeFlag('a'), makeFlag('b'), makeFlag('c')];
      const result = bulkEnable(flags, ['a', 'b']);
      expect(result.successful).toEqual(['a', 'b']);
      expect(flags[0].status).toBe('active');
      expect(flags[1].status).toBe('active');
      expect(flags[2].status).toBe('inactive');
    });

    it('should report missing flags', () => {
      const flags = [makeFlag('a')];
      const result = bulkEnable(flags, ['a', 'missing']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].name).toBe('missing');
    });
  });

  describe('bulkDisable', () => {
    it('should disable multiple flags', () => {
      const flags = [makeFlag('a', { status: 'active' }), makeFlag('b', { status: 'active' })];
      const result = bulkDisable(flags, ['a', 'b']);
      expect(result.successful).toHaveLength(2);
      expect(flags[0].status).toBe('inactive');
    });
  });

  describe('bulkArchive', () => {
    it('should archive multiple flags', () => {
      const flags = [makeFlag('a'), makeFlag('b')];
      bulkArchive(flags, ['a', 'b']);
      expect(flags.every(f => f.status === 'archived')).toBe(true);
    });
  });

  describe('bulkAddTag', () => {
    it('should add tag to flags', () => {
      const flags = [makeFlag('a'), makeFlag('b')];
      const result = bulkAddTag(flags, ['a', 'b'], 'new-tag');
      expect(result.successful).toHaveLength(2);
      expect(flags[0].tags).toContain('new-tag');
    });

    it('should not duplicate tags', () => {
      const flags = [makeFlag('a', { tags: ['existing'] })];
      bulkAddTag(flags, ['a'], 'existing');
      expect(flags[0].tags!.filter(t => t === 'existing')).toHaveLength(1);
    });
  });

  describe('bulkRemoveTag', () => {
    it('should remove tag from flags', () => {
      const flags = [makeFlag('a', { tags: ['remove-me', 'keep'] })];
      bulkRemoveTag(flags, ['a'], 'remove-me');
      expect(flags[0].tags).not.toContain('remove-me');
      expect(flags[0].tags).toContain('keep');
    });
  });

  describe('bulkSetOwner', () => {
    it('should set owner on flags', () => {
      const flags = [makeFlag('a'), makeFlag('b')];
      bulkSetOwner(flags, ['a', 'b'], 'new-team');
      expect(flags[0].owner).toBe('new-team');
      expect(flags[1].owner).toBe('new-team');
    });
  });

  describe('bulkDelete', () => {
    it('should delete flags from manifest', () => {
      const manifest: FlagManifest = {
        version: '1.0',
        flags: [makeFlag('a'), makeFlag('b'), makeFlag('c')],
      };
      const result = bulkDelete(manifest, ['a', 'c']);
      expect(result.successful).toEqual(['a', 'c']);
      expect(manifest.flags).toHaveLength(1);
      expect(manifest.flags[0].name).toBe('b');
    });

    it('should report missing flags in delete', () => {
      const manifest: FlagManifest = { version: '1.0', flags: [] };
      const result = bulkDelete(manifest, ['missing']);
      expect(result.failed).toHaveLength(1);
    });
  });
});
