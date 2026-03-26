import { diffManifests, diffFlags, formatDiff, hasChanges } from './diff';
import { FlagDefinition, FlagManifest } from './types';

describe('Diff', () => {
  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  });

  describe('diffManifests', () => {
    it('should detect added flags', () => {
      const before: FlagManifest = { version: '1.0', flags: [] };
      const after: FlagManifest = { version: '1.0', flags: [makeFlag('new')] };
      const diff = diffManifests(before, after);
      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].name).toBe('new');
    });

    it('should detect removed flags', () => {
      const before: FlagManifest = { version: '1.0', flags: [makeFlag('old')] };
      const after: FlagManifest = { version: '1.0', flags: [] };
      const diff = diffManifests(before, after);
      expect(diff.removed).toHaveLength(1);
    });

    it('should detect modified flags', () => {
      const before: FlagManifest = { version: '1.0', flags: [makeFlag('mod', { description: 'old' })] };
      const after: FlagManifest = { version: '1.0', flags: [makeFlag('mod', { description: 'new' })] };
      const diff = diffManifests(before, after);
      expect(diff.modified).toHaveLength(1);
    });

    it('should detect unchanged flags', () => {
      const flag = makeFlag('same');
      const before: FlagManifest = { version: '1.0', flags: [flag] };
      const after: FlagManifest = { version: '1.0', flags: [{ ...flag }] };
      const diff = diffManifests(before, after);
      expect(diff.unchanged).toHaveLength(1);
    });
  });

  describe('diffFlags', () => {
    it('should detect field changes', () => {
      const changes = diffFlags(
        makeFlag('a', { status: 'active' }),
        makeFlag('a', { status: 'inactive' })
      );
      expect(changes.some(c => c.field === 'status')).toBe(true);
    });

    it('should detect tag changes', () => {
      const changes = diffFlags(
        makeFlag('a', { tags: ['old'] }),
        makeFlag('a', { tags: ['new'] })
      );
      expect(changes.some(c => c.field === 'tags')).toBe(true);
    });

    it('should detect environment changes', () => {
      const changes = diffFlags(
        makeFlag('a', { environments: [{ name: 'prod', enabled: true }] }),
        makeFlag('a', { environments: [{ name: 'prod', enabled: false }] })
      );
      expect(changes.some(c => c.field === 'environments')).toBe(true);
    });

    it('should return empty for identical flags', () => {
      const flag = makeFlag('same');
      expect(diffFlags(flag, { ...flag })).toHaveLength(0);
    });
  });

  describe('formatDiff', () => {
    it('should format diff output', () => {
      const diff = diffManifests(
        { version: '1.0', flags: [makeFlag('removed')] },
        { version: '1.0', flags: [makeFlag('added')] }
      );
      const output = formatDiff(diff);
      expect(output).toContain('Added');
      expect(output).toContain('Removed');
    });
  });

  describe('hasChanges', () => {
    it('should return true when there are changes', () => {
      const diff = diffManifests(
        { version: '1.0', flags: [] },
        { version: '1.0', flags: [makeFlag('new')] }
      );
      expect(hasChanges(diff)).toBe(true);
    });

    it('should return false for no changes', () => {
      const flag = makeFlag('same');
      const diff = diffManifests(
        { version: '1.0', flags: [flag] },
        { version: '1.0', flags: [{ ...flag }] }
      );
      expect(hasChanges(diff)).toBe(false);
    });
  });
});
