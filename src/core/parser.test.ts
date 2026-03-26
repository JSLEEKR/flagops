import { parseYaml, parseJson, toYaml, toJson, normalizeManifest, normalizeFlag, validateManifest, validateFlag, detectFormat, parseContent } from './parser';
import { FlagDefinition, FlagManifest } from './types';

describe('Parser', () => {
  const sampleFlag: FlagDefinition = {
    name: 'test-flag',
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  describe('parseYaml', () => {
    it('should parse valid YAML', () => {
      const yaml = `version: "1.0"\nflags:\n  - name: test\n    status: active\n    type: boolean\n    defaultValue: true\n    createdAt: "2024-01-01"\n    updatedAt: "2024-01-01"`;
      const result = parseYaml(yaml);
      expect(result.version).toBe('1.0');
      expect(result.flags).toHaveLength(1);
      expect(result.flags[0].name).toBe('test');
    });

    it('should handle empty YAML', () => {
      const result = parseYaml('');
      expect(result.flags).toHaveLength(0);
    });

    it('should handle YAML with namespace', () => {
      const yaml = `version: "1.0"\nnamespace: myapp\nflags: []`;
      const result = parseYaml(yaml);
      expect(result.namespace).toBe('myapp');
    });
  });

  describe('parseJson', () => {
    it('should parse valid JSON', () => {
      const json = JSON.stringify({ version: '1.0', flags: [sampleFlag] });
      const result = parseJson(json);
      expect(result.flags).toHaveLength(1);
    });

    it('should handle JSON with no flags', () => {
      const result = parseJson('{"version":"1.0","flags":[]}');
      expect(result.flags).toHaveLength(0);
    });
  });

  describe('toYaml / toJson', () => {
    it('should serialize to YAML', () => {
      const manifest: FlagManifest = { version: '1.0', flags: [sampleFlag] };
      const yaml = toYaml(manifest);
      expect(yaml).toContain('test-flag');
      expect(yaml).toContain('version');
    });

    it('should serialize to JSON', () => {
      const manifest: FlagManifest = { version: '1.0', flags: [sampleFlag] };
      const json = toJson(manifest);
      const parsed = JSON.parse(json);
      expect(parsed.flags[0].name).toBe('test-flag');
    });

    it('should roundtrip YAML', () => {
      const manifest: FlagManifest = { version: '1.0', flags: [sampleFlag] };
      const yaml = toYaml(manifest);
      const reparsed = parseYaml(yaml);
      expect(reparsed.flags[0].name).toBe('test-flag');
    });

    it('should roundtrip JSON', () => {
      const manifest: FlagManifest = { version: '1.0', flags: [sampleFlag] };
      const json = toJson(manifest);
      const reparsed = parseJson(json);
      expect(reparsed.flags[0].name).toBe('test-flag');
    });
  });

  describe('normalizeManifest', () => {
    it('should handle null input', () => {
      const result = normalizeManifest(null);
      expect(result.version).toBe('1.0');
      expect(result.flags).toHaveLength(0);
    });

    it('should handle missing flags array', () => {
      const result = normalizeManifest({ version: '2.0' });
      expect(result.version).toBe('2.0');
      expect(result.flags).toHaveLength(0);
    });

    it('should filter out invalid flags', () => {
      const result = normalizeManifest({ flags: [{ name: 'valid' }, null, { noName: true }] });
      expect(result.flags).toHaveLength(1);
    });
  });

  describe('normalizeFlag', () => {
    it('should normalize a minimal flag', () => {
      const result = normalizeFlag({ name: 'test' });
      expect(result).not.toBeNull();
      expect(result!.type).toBe('boolean');
      expect(result!.status).toBe('inactive');
      expect(result!.defaultValue).toBe(false);
    });

    it('should return null for invalid input', () => {
      expect(normalizeFlag(null)).toBeNull();
      expect(normalizeFlag({})).toBeNull();
      expect(normalizeFlag({ name: '' })).toBeNull();
    });

    it('should preserve valid fields', () => {
      const result = normalizeFlag({
        name: 'test',
        description: 'A test',
        owner: 'john',
        tags: ['beta', 'ui'],
        type: 'string',
        status: 'active',
        defaultValue: 'hello',
      });
      expect(result!.description).toBe('A test');
      expect(result!.owner).toBe('john');
      expect(result!.tags).toEqual(['beta', 'ui']);
    });
  });

  describe('validateManifest', () => {
    it('should validate empty manifest', () => {
      const errors = validateManifest({ version: '1.0', flags: [] });
      expect(errors).toHaveLength(0);
    });

    it('should detect missing version', () => {
      const errors = validateManifest({ version: '', flags: [] });
      expect(errors.some(e => e.field === 'version')).toBe(true);
    });

    it('should detect duplicate flag names', () => {
      const errors = validateManifest({
        version: '1.0',
        flags: [
          { ...sampleFlag, name: 'dup' },
          { ...sampleFlag, name: 'dup' },
        ],
      });
      expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });
  });

  describe('validateFlag', () => {
    it('should validate a valid flag', () => {
      const errors = validateFlag(sampleFlag);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid flag name', () => {
      const errors = validateFlag({ ...sampleFlag, name: '123invalid' });
      expect(errors.some(e => e.field.includes('name'))).toBe(true);
    });

    it('should warn on type mismatch for boolean', () => {
      const errors = validateFlag({ ...sampleFlag, type: 'boolean', defaultValue: 'not-bool' as any });
      expect(errors.some(e => e.field.includes('defaultValue'))).toBe(true);
    });

    it('should warn on type mismatch for number', () => {
      const errors = validateFlag({ ...sampleFlag, type: 'number', defaultValue: 'str' as any });
      expect(errors.some(e => e.field.includes('defaultValue'))).toBe(true);
    });

    it('should detect invalid rollout percentage', () => {
      const errors = validateFlag({ ...sampleFlag, rollout: { percentage: 150 } });
      expect(errors.some(e => e.field.includes('rollout'))).toBe(true);
    });

    it('should detect invalid expiration date', () => {
      const errors = validateFlag({ ...sampleFlag, expiresAt: 'not-a-date' });
      expect(errors.some(e => e.field.includes('expiresAt'))).toBe(true);
    });

    it('should detect missing rule attribute', () => {
      const errors = validateFlag({
        ...sampleFlag,
        rules: [{ attribute: '', operator: 'eq', value: 'x' }],
      });
      expect(errors.some(e => e.field.includes('rules'))).toBe(true);
    });
  });

  describe('detectFormat', () => {
    it('should detect JSON', () => {
      expect(detectFormat('flags.json')).toBe('json');
    });

    it('should detect YAML by default', () => {
      expect(detectFormat('flags.yml')).toBe('yaml');
      expect(detectFormat('.flagops.yaml')).toBe('yaml');
      expect(detectFormat('something.txt')).toBe('yaml');
    });
  });

  describe('parseContent', () => {
    it('should parse JSON content', () => {
      const result = parseContent('{"version":"1.0","flags":[]}', 'json');
      expect(result.version).toBe('1.0');
    });

    it('should parse YAML content', () => {
      const result = parseContent('version: "1.0"\nflags: []', 'yaml');
      expect(result.version).toBe('1.0');
    });
  });
});
