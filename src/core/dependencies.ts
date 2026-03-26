/**
 * Flag dependency tracking — define and validate dependencies between flags
 */
import { FlagDefinition, FlagManifest } from './types';

export interface FlagDependency {
  flagName: string;
  dependsOn: string;
  type: 'requires' | 'conflicts' | 'implies';
}

/**
 * Extract dependencies from flag metadata
 * Convention: flags can have a `_depends` tag like "requires:other-flag"
 */
export function extractDependencies(flags: FlagDefinition[]): FlagDependency[] {
  const deps: FlagDependency[] = [];

  for (const flag of flags) {
    if (!flag.tags) continue;
    for (const tag of flag.tags) {
      const match = tag.match(/^(requires|conflicts|implies):(.+)$/);
      if (match) {
        deps.push({
          flagName: flag.name,
          dependsOn: match[2],
          type: match[1] as FlagDependency['type'],
        });
      }
    }
  }

  return deps;
}

/**
 * Validate dependencies — check for missing refs and circular deps
 */
export function validateDependencies(
  flags: FlagDefinition[],
  deps: FlagDependency[]
): string[] {
  const errors: string[] = [];
  const flagNames = new Set(flags.map(f => f.name));

  for (const dep of deps) {
    if (!flagNames.has(dep.dependsOn)) {
      errors.push(`Flag '${dep.flagName}' depends on unknown flag '${dep.dependsOn}'`);
    }
  }

  // Check for circular dependencies
  const cycles = detectCycles(deps);
  for (const cycle of cycles) {
    errors.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
  }

  return errors;
}

/**
 * Detect circular dependencies using DFS
 */
export function detectCycles(deps: FlagDependency[]): string[][] {
  const graph = new Map<string, string[]>();

  for (const dep of deps) {
    if (dep.type === 'requires' || dep.type === 'implies') {
      const existing = graph.get(dep.flagName) || [];
      existing.push(dep.dependsOn);
      graph.set(dep.flagName, existing);
    }
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, node]);
    }

    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    dfs(node, []);
  }

  return cycles;
}

/**
 * Get the dependency tree for a specific flag
 */
export function getDependencyTree(
  flagName: string,
  deps: FlagDependency[]
): Map<string, FlagDependency[]> {
  const tree = new Map<string, FlagDependency[]>();
  const visited = new Set<string>();

  function collect(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);

    const flagDeps = deps.filter(d => d.flagName === name);
    if (flagDeps.length > 0) {
      tree.set(name, flagDeps);
      for (const dep of flagDeps) {
        collect(dep.dependsOn);
      }
    }
  }

  collect(flagName);
  return tree;
}

/**
 * Check if enabling a flag would violate any conflict dependencies
 */
export function checkConflicts(
  flagName: string,
  activeFlags: Set<string>,
  deps: FlagDependency[]
): string[] {
  const conflicts: string[] = [];

  for (const dep of deps) {
    if (dep.type === 'conflicts') {
      if (dep.flagName === flagName && activeFlags.has(dep.dependsOn)) {
        conflicts.push(`'${flagName}' conflicts with active flag '${dep.dependsOn}'`);
      }
      if (dep.dependsOn === flagName && activeFlags.has(dep.flagName)) {
        conflicts.push(`Active flag '${dep.flagName}' conflicts with '${flagName}'`);
      }
    }
  }

  return conflicts;
}

/**
 * Get flags that would be affected by toggling a flag
 */
export function getAffectedFlags(
  flagName: string,
  deps: FlagDependency[]
): string[] {
  const affected = new Set<string>();

  for (const dep of deps) {
    if (dep.dependsOn === flagName) {
      affected.add(dep.flagName);
    }
  }

  return [...affected];
}
