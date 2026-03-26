import { exportFlags, toEnvFormat, toCsvFormat, generateTypeDefinition } from './exporter';
import { FlagManifest, FlagDefinition } from './types';

describe('Exporter', () => {
  const makeFlag = (name: string, overrides: Partial<FlagDefinition> = {}): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  });

  const manifest: FlagManifest = {
    version: '1.0',
    namespace: 'myapp',
    flags: [
      makeFlag('dark-mode', { description: 'Dark theme' }),
      makeFlag('api-rate', { type: 'number', defaultValue: 100 }),
      makeFlag('greeting', { type: 'string', defaultValue: 'hello' }),
    ],
  };

  describe('exportFlags', () => {
    it('should export as YAML', () => {
      const result = exportFlags(manifest, 'yaml');
      expect(result).toContain('dark-mode');
    });

    it('should export as JSON', () => {
      const result = exportFlags(manifest, 'json');
      const parsed = JSON.parse(result);
      expect(parsed.flags).toHaveLength(3);
    });

    it('should export as env', () => {
      const result = exportFlags(manifest, 'env');
      expect(result).toContain('MYAPP_DARK_MODE=1');
    });

    it('should export as csv', () => {
      const result = exportFlags(manifest, 'csv');
      expect(result).toContain('name,status');
      expect(result).toContain('dark-mode');
    });

    it('should throw on unsupported format', () => {
      expect(() => exportFlags(manifest, 'xml' as any)).toThrow('Unsupported');
    });
  });

  describe('toEnvFormat', () => {
    it('should use namespace as prefix', () => {
      const result = toEnvFormat(manifest);
      expect(result).toContain('MYAPP_');
    });

    it('should use FLAG_ prefix when no namespace', () => {
      const m = { ...manifest, namespace: undefined };
      const result = toEnvFormat(m);
      expect(result).toContain('FLAG_');
    });

    it('should convert boolean to 1/0', () => {
      const result = toEnvFormat(manifest);
      expect(result).toContain('=1');
    });

    it('should include description as comment', () => {
      const result = toEnvFormat(manifest);
      expect(result).toContain('# Dark theme');
    });
  });

  describe('toCsvFormat', () => {
    it('should have header row', () => {
      const result = toCsvFormat(manifest);
      const lines = result.trim().split('\n');
      expect(lines[0]).toContain('name');
      expect(lines[0]).toContain('status');
    });

    it('should have data rows', () => {
      const result = toCsvFormat(manifest);
      const lines = result.trim().split('\n');
      expect(lines.length).toBe(4); // header + 3 flags
    });

    it('should escape commas in values', () => {
      const m: FlagManifest = {
        version: '1.0',
        flags: [makeFlag('test', { description: 'has, comma' })],
      };
      const result = toCsvFormat(m);
      expect(result).toContain('"has, comma"');
    });
  });

  describe('generateTypeDefinition', () => {
    it('should generate valid TypeScript', () => {
      const result = generateTypeDefinition(manifest);
      expect(result).toContain('interface FlagOpsFlags');
      expect(result).toContain("'dark-mode': boolean");
      expect(result).toContain("'api-rate': number");
      expect(result).toContain("'greeting': string");
    });

    it('should include descriptions as JSDoc', () => {
      const result = generateTypeDefinition(manifest);
      expect(result).toContain('/** Dark theme */');
    });

    it('should export FlagName type', () => {
      const result = generateTypeDefinition(manifest);
      expect(result).toContain('FlagName');
    });
  });
});
