import { extractDependencies, validateDependencies, detectCycles, getDependencyTree, checkConflicts, getAffectedFlags, FlagDependency } from './dependencies';
import { FlagDefinition } from './types';

describe('Dependencies', () => {
  const makeFlag = (name: string, tags?: string[]): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    tags,
  });

  describe('extractDependencies', () => {
    it('should extract requires dependency', () => {
      const flags = [makeFlag('child', ['requires:parent'])];
      const deps = extractDependencies(flags);
      expect(deps).toHaveLength(1);
      expect(deps[0].type).toBe('requires');
      expect(deps[0].dependsOn).toBe('parent');
    });

    it('should extract conflicts dependency', () => {
      const flags = [makeFlag('new-ui', ['conflicts:old-ui'])];
      const deps = extractDependencies(flags);
      expect(deps[0].type).toBe('conflicts');
    });

    it('should extract implies dependency', () => {
      const flags = [makeFlag('premium', ['implies:analytics'])];
      const deps = extractDependencies(flags);
      expect(deps[0].type).toBe('implies');
    });

    it('should ignore non-dependency tags', () => {
      const flags = [makeFlag('basic', ['ui', 'frontend'])];
      const deps = extractDependencies(flags);
      expect(deps).toHaveLength(0);
    });

    it('should handle flags without tags', () => {
      const flags = [makeFlag('no-tags')];
      const deps = extractDependencies(flags);
      expect(deps).toHaveLength(0);
    });
  });

  describe('validateDependencies', () => {
    it('should detect missing dependency targets', () => {
      const flags = [makeFlag('child')];
      const deps: FlagDependency[] = [{ flagName: 'child', dependsOn: 'missing', type: 'requires' }];
      const errors = validateDependencies(flags, deps);
      expect(errors.some(e => e.includes('unknown flag'))).toBe(true);
    });

    it('should pass for valid dependencies', () => {
      const flags = [makeFlag('child'), makeFlag('parent')];
      const deps: FlagDependency[] = [{ flagName: 'child', dependsOn: 'parent', type: 'requires' }];
      const errors = validateDependencies(flags, deps);
      expect(errors).toHaveLength(0);
    });

    it('should detect circular dependencies', () => {
      const flags = [makeFlag('a'), makeFlag('b')];
      const deps: FlagDependency[] = [
        { flagName: 'a', dependsOn: 'b', type: 'requires' },
        { flagName: 'b', dependsOn: 'a', type: 'requires' },
      ];
      const errors = validateDependencies(flags, deps);
      expect(errors.some(e => e.includes('Circular'))).toBe(true);
    });
  });

  describe('detectCycles', () => {
    it('should detect simple cycle', () => {
      const deps: FlagDependency[] = [
        { flagName: 'a', dependsOn: 'b', type: 'requires' },
        { flagName: 'b', dependsOn: 'a', type: 'requires' },
      ];
      const cycles = detectCycles(deps);
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should not detect cycle in acyclic graph', () => {
      const deps: FlagDependency[] = [
        { flagName: 'a', dependsOn: 'b', type: 'requires' },
        { flagName: 'b', dependsOn: 'c', type: 'requires' },
      ];
      const cycles = detectCycles(deps);
      expect(cycles).toHaveLength(0);
    });

    it('should skip conflict type for cycle detection', () => {
      const deps: FlagDependency[] = [
        { flagName: 'a', dependsOn: 'b', type: 'conflicts' },
        { flagName: 'b', dependsOn: 'a', type: 'conflicts' },
      ];
      const cycles = detectCycles(deps);
      expect(cycles).toHaveLength(0);
    });
  });

  describe('getDependencyTree', () => {
    it('should build dependency tree', () => {
      const deps: FlagDependency[] = [
        { flagName: 'a', dependsOn: 'b', type: 'requires' },
        { flagName: 'b', dependsOn: 'c', type: 'requires' },
      ];
      const tree = getDependencyTree('a', deps);
      expect(tree.has('a')).toBe(true);
      expect(tree.has('b')).toBe(true);
    });

    it('should handle no dependencies', () => {
      const tree = getDependencyTree('solo', []);
      expect(tree.size).toBe(0);
    });
  });

  describe('checkConflicts', () => {
    it('should detect conflict with active flag', () => {
      const deps: FlagDependency[] = [
        { flagName: 'new-ui', dependsOn: 'old-ui', type: 'conflicts' },
      ];
      const active = new Set(['old-ui']);
      const conflicts = checkConflicts('new-ui', active, deps);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should not flag non-conflicts', () => {
      const deps: FlagDependency[] = [
        { flagName: 'a', dependsOn: 'b', type: 'requires' },
      ];
      const active = new Set(['b']);
      const conflicts = checkConflicts('a', active, deps);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getAffectedFlags', () => {
    it('should find affected flags', () => {
      const deps: FlagDependency[] = [
        { flagName: 'child1', dependsOn: 'parent', type: 'requires' },
        { flagName: 'child2', dependsOn: 'parent', type: 'requires' },
      ];
      const affected = getAffectedFlags('parent', deps);
      expect(affected).toContain('child1');
      expect(affected).toContain('child2');
    });

    it('should return empty for no dependents', () => {
      const affected = getAffectedFlags('solo', []);
      expect(affected).toHaveLength(0);
    });
  });
});
