import { FlagOpsClient, createClient } from './client';
import { FlagDefinition } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FlagOpsClient', () => {
  let tmpDir: string;
  let tmpFile: string;

  const makeManifest = (flags: Partial<FlagDefinition>[]) => {
    return {
      version: '1.0',
      flags: flags.map(f => ({
        name: f.name || 'test',
        status: f.status || 'active',
        type: f.type || 'boolean',
        defaultValue: f.defaultValue !== undefined ? f.defaultValue : true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        ...f,
      })),
    };
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagops-client-'));
    tmpFile = path.join(tmpDir, '.flagops.yml');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeManifest(flags: Partial<FlagDefinition>[]) {
    const yaml = require('yaml');
    fs.writeFileSync(tmpFile, yaml.stringify(makeManifest(flags)));
  }

  it('should create client with createClient', () => {
    const client = createClient({ filePath: tmpFile });
    expect(client).toBeInstanceOf(FlagOpsClient);
    client.destroy();
  });

  it('should handle missing file gracefully', () => {
    const client = new FlagOpsClient({ filePath: tmpFile });
    expect(client.isEnabled('missing')).toBe(false);
    client.destroy();
  });

  it('should evaluate boolean flag', () => {
    writeManifest([{ name: 'feature-x', status: 'active', defaultValue: true }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    expect(client.isEnabled('feature-x')).toBe(true);
    client.destroy();
  });

  it('should return false for inactive flag', () => {
    writeManifest([{ name: 'off-flag', status: 'inactive' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    expect(client.isEnabled('off-flag')).toBe(false);
    client.destroy();
  });

  it('should get typed value', () => {
    writeManifest([{ name: 'msg', type: 'string', defaultValue: 'hello' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    expect(client.getValue<string>('msg')).toBe('hello');
    client.destroy();
  });

  it('should return default for missing flag', () => {
    const client = new FlagOpsClient({ filePath: tmpFile });
    expect(client.getValueWithDefault('missing', 42)).toBe(42);
    client.destroy();
  });

  it('should use default context', () => {
    writeManifest([{
      name: 'env-flag',
      environments: [{ name: 'staging', enabled: true, value: false }],
    }]);
    const client = new FlagOpsClient({
      filePath: tmpFile,
      defaultContext: { environment: 'staging' },
    });
    expect(client.isEnabled('env-flag')).toBe(false);
    client.destroy();
  });

  it('should merge context with default', () => {
    writeManifest([{ name: 'ctx-flag' }]);
    const client = new FlagOpsClient({
      filePath: tmpFile,
      defaultContext: { environment: 'prod' },
    });
    const result = client.evaluate('ctx-flag', { userId: 'user1' });
    expect(result.flagName).toBe('ctx-flag');
    client.destroy();
  });

  it('should cache evaluations', () => {
    writeManifest([{ name: 'cached' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    const r1 = client.evaluate('cached');
    const r2 = client.evaluate('cached');
    expect(r1.timestamp).toBe(r2.timestamp); // same cached result
    client.destroy();
  });

  it('should clear cache', () => {
    writeManifest([{ name: 'cached' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    client.evaluate('cached');
    client.clearCache();
    const r2 = client.evaluate('cached');
    expect(r2).toBeDefined();
    client.destroy();
  });

  it('should reload flags', () => {
    writeManifest([{ name: 'initial' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    expect(client.getFlags()).toHaveLength(1);

    writeManifest([{ name: 'initial' }, { name: 'added' }]);
    client.reload();
    expect(client.getFlags()).toHaveLength(2);
    client.destroy();
  });

  it('should evaluate all flags', () => {
    writeManifest([{ name: 'a' }, { name: 'b' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    const results = client.evaluateAll();
    expect(results.size).toBe(2);
    client.destroy();
  });

  it('should get flag definition', () => {
    writeManifest([{ name: 'def-test', description: 'test desc' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    const flag = client.getFlag('def-test');
    expect(flag).toBeDefined();
    expect(flag!.description).toBe('test desc');
    client.destroy();
  });

  it('should set cache TTL', () => {
    const client = new FlagOpsClient({ filePath: tmpFile });
    client.setCacheTtl(1000);
    client.destroy();
  });

  it('should start and stop auto refresh', () => {
    writeManifest([{ name: 'auto' }]);
    const client = new FlagOpsClient({ filePath: tmpFile });
    client.startAutoRefresh(60000);
    client.stopAutoRefresh();
    client.destroy();
  });

  it('should handle error callback', () => {
    let errorCaught = false;
    const badFile = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(badFile, 'not valid json {{{');
    const client = new FlagOpsClient({
      filePath: badFile,
      onError: () => { errorCaught = true; },
    });
    expect(errorCaught).toBe(true);
    client.destroy();
  });

  it('should get underlying store', () => {
    const client = new FlagOpsClient({ filePath: tmpFile });
    expect(client.getStore()).toBeDefined();
    client.destroy();
  });
});
