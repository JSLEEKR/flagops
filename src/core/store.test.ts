import { FlagStore } from './store';
import { FlagDefinition } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FlagStore', () => {
  let tmpDir: string;
  let tmpFile: string;

  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagops-'));
    tmpFile = path.join(tmpDir, '.flagops.yml');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('load/save', () => {
    it('should create empty store when file missing', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      expect(store.getFlags()).toHaveLength(0);
    });

    it('should save and reload flags', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('feature-a'));
      store.save();

      const store2 = new FlagStore(tmpFile);
      store2.load();
      expect(store2.getFlags()).toHaveLength(1);
      expect(store2.getFlag('feature-a')).toBeDefined();
    });

    it('should handle JSON format', () => {
      const jsonFile = path.join(tmpDir, 'flags.json');
      const store = new FlagStore(jsonFile);
      store.load();
      store.addFlag(makeFlag('json-flag'));
      store.save();

      const content = fs.readFileSync(jsonFile, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.flags[0].name).toBe('json-flag');
    });
  });

  describe('loadFromString', () => {
    it('should load from YAML string', () => {
      const store = new FlagStore();
      store.loadFromString('version: "1.0"\nflags:\n  - name: from-string\n    status: active\n    type: boolean\n    defaultValue: true\n    createdAt: "2024-01-01"\n    updatedAt: "2024-01-01"');
      expect(store.getFlag('from-string')).toBeDefined();
    });

    it('should load from JSON string', () => {
      const store = new FlagStore();
      store.loadFromString('{"version":"1.0","flags":[{"name":"json-str","status":"active","type":"boolean","defaultValue":true,"createdAt":"2024","updatedAt":"2024"}]}', 'json');
      expect(store.getFlag('json-str')).toBeDefined();
    });
  });

  describe('CRUD operations', () => {
    it('should add a flag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('new-flag'));
      expect(store.hasFlag('new-flag')).toBe(true);
    });

    it('should throw on duplicate add', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('dup'));
      expect(() => store.addFlag(makeFlag('dup'))).toThrow('already exists');
    });

    it('should update a flag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('upd'));
      const updated = store.updateFlag('upd', { description: 'updated' });
      expect(updated.description).toBe('updated');
    });

    it('should throw on update non-existent', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      expect(() => store.updateFlag('nope', {})).toThrow('not found');
    });

    it('should remove a flag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('rm'));
      expect(store.removeFlag('rm')).toBe(true);
      expect(store.hasFlag('rm')).toBe(false);
    });

    it('should return false removing non-existent flag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      expect(store.removeFlag('nope')).toBe(false);
    });
  });

  describe('toggle/archive', () => {
    it('should toggle active to inactive', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('tog', { status: 'active' }));
      const result = store.toggleFlag('tog');
      expect(result.status).toBe('inactive');
    });

    it('should toggle inactive to active', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('tog2', { status: 'inactive' }));
      const result = store.toggleFlag('tog2');
      expect(result.status).toBe('active');
    });

    it('should throw toggling non-existent', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      expect(() => store.toggleFlag('nope')).toThrow();
    });

    it('should archive a flag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('arch'));
      const result = store.archiveFlag('arch');
      expect(result.status).toBe('archived');
    });
  });

  describe('evaluate', () => {
    it('should evaluate existing flag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('eval-flag'));
      const result = store.evaluate('eval-flag');
      expect(result.value).toBe(true);
    });

    it('should return not-found for missing flag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      const result = store.evaluate('missing');
      expect(result.reason).toBe('not-found');
    });

    it('should evaluate all flags', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('a'));
      store.addFlag(makeFlag('b'));
      const results = store.evaluateAll();
      expect(results.size).toBe(2);
    });
  });

  describe('filterFlags', () => {
    it('should filter by status', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('active-f', { status: 'active' }));
      store.addFlag(makeFlag('inactive-f', { status: 'inactive' }));
      expect(store.filterFlags({ status: 'active' })).toHaveLength(1);
    });

    it('should filter by type', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('bool-f', { type: 'boolean' }));
      store.addFlag(makeFlag('str-f', { type: 'string', defaultValue: 'x' }));
      expect(store.filterFlags({ type: 'string' })).toHaveLength(1);
    });

    it('should filter by tag', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('tagged', { tags: ['beta'] }));
      store.addFlag(makeFlag('untagged'));
      expect(store.filterFlags({ tag: 'beta' })).toHaveLength(1);
    });

    it('should filter by search term', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('dark-mode', { description: 'Dark theme toggle' }));
      store.addFlag(makeFlag('other'));
      expect(store.filterFlags({ search: 'dark' })).toHaveLength(1);
    });

    it('should filter by owner', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('owned', { owner: 'alice' }));
      store.addFlag(makeFlag('other'));
      expect(store.filterFlags({ owner: 'alice' })).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should compute stats', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('a', { status: 'active', tags: ['ui'] }));
      store.addFlag(makeFlag('b', { status: 'inactive', tags: ['backend'] }));
      store.addFlag(makeFlag('c', { status: 'archived' }));
      const stats = store.getStats();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.inactive).toBe(1);
      expect(stats.archived).toBe(1);
      expect(stats.byTag['ui']).toBe(1);
    });
  });

  describe('merge', () => {
    it('should merge non-conflicting flags', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('a'));
      store.merge({ version: '1.0', flags: [makeFlag('b')] });
      expect(store.getFlags()).toHaveLength(2);
    });

    it('should throw on conflict with error strategy', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('a'));
      expect(() => store.merge({ version: '1.0', flags: [makeFlag('a')] })).toThrow('Conflict');
    });

    it('should overwrite with theirs strategy', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('a', { description: 'old' }));
      store.merge({ version: '1.0', flags: [makeFlag('a', { description: 'new' })] }, 'theirs');
      expect(store.getFlag('a')!.description).toBe('new');
    });

    it('should keep ours with ours strategy', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('a', { description: 'mine' }));
      store.merge({ version: '1.0', flags: [makeFlag('a', { description: 'theirs' })] }, 'ours');
      expect(store.getFlag('a')!.description).toBe('mine');
    });
  });

  describe('audit', () => {
    it('should track create/update/delete in audit log', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('audit-test'));
      store.updateFlag('audit-test', { description: 'changed' });
      store.removeFlag('audit-test');
      const log = store.getAuditLog();
      expect(log).toHaveLength(3);
      expect(log[0].action).toBe('create');
      expect(log[1].action).toBe('update');
      expect(log[2].action).toBe('delete');
    });
  });

  describe('clone', () => {
    it('should deep clone the store', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('clone-me'));
      const cloned = store.clone();
      cloned.updateFlag('clone-me', { description: 'cloned' });
      expect(store.getFlag('clone-me')!.description).toBeUndefined();
    });
  });

  describe('serialize', () => {
    it('should serialize to yaml', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('ser'));
      const output = store.serialize('yaml');
      expect(output).toContain('ser');
    });

    it('should serialize to json', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('ser'));
      const output = store.serialize('json');
      expect(JSON.parse(output).flags[0].name).toBe('ser');
    });
  });

  describe('namespace', () => {
    it('should set namespace', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.setNamespace('myapp');
      expect(store.getManifest().namespace).toBe('myapp');
    });
  });

  describe('getExpiredFlags', () => {
    it('should find expired flags', () => {
      const store = new FlagStore(tmpFile);
      store.load();
      store.addFlag(makeFlag('exp', { expiresAt: '2020-01-01T00:00:00.000Z' }));
      store.addFlag(makeFlag('not-exp', { expiresAt: '2099-01-01T00:00:00.000Z' }));
      expect(store.getExpiredFlags()).toHaveLength(1);
    });
  });
});
