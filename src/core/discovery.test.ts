import { discoverManifests, mergeDiscovered, findDuplicates, DiscoveryResult } from './discovery';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';

describe('Discovery', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagops-disc-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeManifest(relativePath: string, flags: any[]) {
    const fullPath = path.join(tmpDir, relativePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, yaml.stringify({ version: '1.0', flags }));
  }

  describe('discoverManifests', () => {
    it('should find manifest in root', () => {
      writeManifest('.flagops.yml', [{ name: 'root-flag', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }]);
      const results = discoverManifests(tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].flagCount).toBe(1);
    });

    it('should find manifests recursively', () => {
      writeManifest('.flagops.yml', [{ name: 'root', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }]);
      writeManifest('sub/.flagops.yml', [{ name: 'sub', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }]);
      const results = discoverManifests(tmpDir);
      expect(results).toHaveLength(2);
    });

    it('should skip node_modules', () => {
      writeManifest('node_modules/.flagops.yml', [{ name: 'hidden', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }]);
      const results = discoverManifests(tmpDir);
      expect(results).toHaveLength(0);
    });

    it('should respect maxDepth', () => {
      writeManifest('a/b/c/d/.flagops.yml', [{ name: 'deep', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }]);
      const results = discoverManifests(tmpDir, { maxDepth: 2 });
      expect(results).toHaveLength(0);
    });

    it('should handle empty directory', () => {
      const results = discoverManifests(tmpDir);
      expect(results).toHaveLength(0);
    });

    it('should support JSON manifests', () => {
      const fullPath = path.join(tmpDir, '.flagops.json');
      fs.writeFileSync(fullPath, JSON.stringify({ version: '1.0', flags: [{ name: 'json', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }] }));
      const results = discoverManifests(tmpDir);
      expect(results).toHaveLength(1);
    });
  });

  describe('mergeDiscovered', () => {
    it('should merge flags from multiple files', () => {
      const results: DiscoveryResult[] = [
        { filePath: 'a.yml', manifest: { version: '1.0', flags: [{ name: 'a', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }] }, flagCount: 1 },
        { filePath: 'b.yml', manifest: { version: '1.0', flags: [{ name: 'b', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }] }, flagCount: 1 },
      ];
      const merged = mergeDiscovered(results);
      expect(merged.flags).toHaveLength(2);
    });

    it('should skip duplicates', () => {
      const results: DiscoveryResult[] = [
        { filePath: 'a.yml', manifest: { version: '1.0', flags: [{ name: 'dup', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }] }, flagCount: 1 },
        { filePath: 'b.yml', manifest: { version: '1.0', flags: [{ name: 'dup', status: 'inactive', type: 'boolean', defaultValue: false, createdAt: '2024', updatedAt: '2024' }] }, flagCount: 1 },
      ];
      const merged = mergeDiscovered(results);
      expect(merged.flags).toHaveLength(1);
    });
  });

  describe('findDuplicates', () => {
    it('should find flags in multiple files', () => {
      const results: DiscoveryResult[] = [
        { filePath: 'a.yml', manifest: { version: '1.0', flags: [{ name: 'shared', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }] }, flagCount: 1 },
        { filePath: 'b.yml', manifest: { version: '1.0', flags: [{ name: 'shared', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }] }, flagCount: 1 },
      ];
      const dups = findDuplicates(results);
      expect(dups.has('shared')).toBe(true);
      expect(dups.get('shared')?.length).toBe(2);
    });

    it('should not flag unique flags', () => {
      const results: DiscoveryResult[] = [
        { filePath: 'a.yml', manifest: { version: '1.0', flags: [{ name: 'unique', status: 'active', type: 'boolean', defaultValue: true, createdAt: '2024', updatedAt: '2024' }] }, flagCount: 1 },
      ];
      const dups = findDuplicates(results);
      expect(dups.size).toBe(0);
    });
  });
});
