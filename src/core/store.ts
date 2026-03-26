/**
 * Flag store — manages loading, saving, and querying flags from manifest files
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  FlagDefinition,
  FlagManifest,
  FlagFilter,
  FlagStats,
  FlagChange,
  AuditEntry,
  EvaluationContext,
  EvaluationResult,
} from './types';
import { parseContent, toYaml, toJson, detectFormat, validateManifest } from './parser';
import { evaluateFlag, evaluateFlags } from './evaluator';

export class FlagStore {
  private manifest: FlagManifest;
  private filePath: string;
  private format: 'yaml' | 'json';
  private auditLog: AuditEntry[] = [];

  constructor(filePath?: string) {
    this.filePath = filePath || '.flagops.yml';
    this.format = detectFormat(this.filePath);
    this.manifest = { version: '1.0', flags: [] };
  }

  /**
   * Load flags from file
   */
  load(filePath?: string): void {
    const fp = filePath || this.filePath;
    this.format = detectFormat(fp);
    this.filePath = fp;

    if (!fs.existsSync(fp)) {
      this.manifest = { version: '1.0', flags: [] };
      return;
    }

    const content = fs.readFileSync(fp, 'utf-8');
    this.manifest = parseContent(content, this.format);
  }

  /**
   * Load from string content
   */
  loadFromString(content: string, format: 'yaml' | 'json' = 'yaml'): void {
    this.format = format;
    this.manifest = parseContent(content, format);
  }

  /**
   * Save flags to file
   */
  save(filePath?: string): void {
    const fp = filePath || this.filePath;
    const format = detectFormat(fp);
    const content = format === 'json' ? toJson(this.manifest) : toYaml(this.manifest);
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fp, content, 'utf-8');
  }

  /**
   * Serialize to string
   */
  serialize(format?: 'yaml' | 'json'): string {
    const f = format || this.format;
    return f === 'json' ? toJson(this.manifest) : toYaml(this.manifest);
  }

  /**
   * Get the manifest
   */
  getManifest(): FlagManifest {
    return this.manifest;
  }

  /**
   * Set the namespace
   */
  setNamespace(namespace: string): void {
    this.manifest.namespace = namespace;
  }

  /**
   * Get all flags
   */
  getFlags(): FlagDefinition[] {
    return [...this.manifest.flags];
  }

  /**
   * Get a single flag by name
   */
  getFlag(name: string): FlagDefinition | undefined {
    return this.manifest.flags.find(f => f.name === name);
  }

  /**
   * Check if a flag exists
   */
  hasFlag(name: string): boolean {
    return this.manifest.flags.some(f => f.name === name);
  }

  /**
   * Add a new flag
   */
  addFlag(flag: FlagDefinition): void {
    if (this.hasFlag(flag.name)) {
      throw new Error(`Flag '${flag.name}' already exists`);
    }
    this.manifest.flags.push(flag);
    this.logAudit('create', flag.name, []);
  }

  /**
   * Update an existing flag
   */
  updateFlag(name: string, updates: Partial<FlagDefinition>): FlagDefinition {
    const index = this.manifest.flags.findIndex(f => f.name === name);
    if (index === -1) {
      throw new Error(`Flag '${name}' not found`);
    }

    const existing = this.manifest.flags[index];
    const changes: FlagChange[] = [];

    for (const [key, newVal] of Object.entries(updates)) {
      if (key === 'name') continue;
      const oldVal = (existing as unknown as Record<string, unknown>)[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          flagName: name,
          field: key,
          oldValue: oldVal,
          newValue: newVal,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const updated = { ...existing, ...updates, name, updatedAt: new Date().toISOString() };
    this.manifest.flags[index] = updated;
    this.logAudit('update', name, changes);

    return updated;
  }

  /**
   * Remove a flag
   */
  removeFlag(name: string): boolean {
    const index = this.manifest.flags.findIndex(f => f.name === name);
    if (index === -1) return false;
    this.manifest.flags.splice(index, 1);
    this.logAudit('delete', name, []);
    return true;
  }

  /**
   * Toggle a flag's status between active/inactive
   */
  toggleFlag(name: string): FlagDefinition {
    const flag = this.getFlag(name);
    if (!flag) throw new Error(`Flag '${name}' not found`);

    const newStatus = flag.status === 'active' ? 'inactive' : 'active';
    return this.updateFlag(name, { status: newStatus });
  }

  /**
   * Archive a flag
   */
  archiveFlag(name: string): FlagDefinition {
    return this.updateFlag(name, { status: 'archived' });
  }

  /**
   * Evaluate a flag
   */
  evaluate(name: string, context?: EvaluationContext): EvaluationResult {
    const flag = this.getFlag(name);
    if (!flag) {
      return {
        flagName: name,
        value: false,
        reason: 'not-found',
        timestamp: new Date().toISOString(),
      };
    }
    return evaluateFlag(flag, context);
  }

  /**
   * Evaluate all flags
   */
  evaluateAll(context?: EvaluationContext): Map<string, EvaluationResult> {
    return evaluateFlags(this.manifest.flags, context);
  }

  /**
   * Filter flags
   */
  filterFlags(filter: FlagFilter): FlagDefinition[] {
    let flags = this.manifest.flags;

    if (filter.status) {
      flags = flags.filter(f => f.status === filter.status);
    }

    if (filter.type) {
      flags = flags.filter(f => f.type === filter.type);
    }

    if (filter.tag) {
      flags = flags.filter(f => f.tags?.includes(filter.tag!));
    }

    if (filter.owner) {
      flags = flags.filter(f => f.owner === filter.owner);
    }

    if (filter.environment) {
      flags = flags.filter(f =>
        f.environments?.some(e => e.name === filter.environment)
      );
    }

    if (filter.search) {
      const term = filter.search.toLowerCase();
      flags = flags.filter(f =>
        f.name.toLowerCase().includes(term) ||
        f.description?.toLowerCase().includes(term)
      );
    }

    return flags;
  }

  /**
   * Get statistics
   */
  getStats(): FlagStats {
    const flags = this.manifest.flags;
    const now = new Date();

    const stats: FlagStats = {
      total: flags.length,
      active: flags.filter(f => f.status === 'active').length,
      inactive: flags.filter(f => f.status === 'inactive').length,
      archived: flags.filter(f => f.status === 'archived').length,
      expired: flags.filter(f => {
        if (!f.expiresAt) return false;
        const exp = new Date(f.expiresAt);
        return !isNaN(exp.getTime()) && exp < now;
      }).length,
      byType: {},
      byTag: {},
    };

    for (const flag of flags) {
      stats.byType[flag.type] = (stats.byType[flag.type] || 0) + 1;
      if (flag.tags) {
        for (const tag of flag.tags) {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        }
      }
    }

    return stats;
  }

  /**
   * Get audit log
   */
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Validate the current manifest
   */
  validate() {
    return validateManifest(this.manifest);
  }

  /**
   * Merge another manifest into this one
   */
  merge(other: FlagManifest, strategy: 'ours' | 'theirs' | 'error' = 'error'): void {
    for (const flag of other.flags) {
      const existing = this.getFlag(flag.name);
      if (existing) {
        if (strategy === 'error') {
          throw new Error(`Conflict: flag '${flag.name}' exists in both manifests`);
        }
        if (strategy === 'theirs') {
          this.updateFlag(flag.name, flag);
        }
        // 'ours' = keep existing
      } else {
        this.addFlag(flag);
      }
    }
  }

  /**
   * Get expired flags
   */
  getExpiredFlags(): FlagDefinition[] {
    const now = new Date();
    return this.manifest.flags.filter(f => {
      if (!f.expiresAt) return false;
      const exp = new Date(f.expiresAt);
      return !isNaN(exp.getTime()) && exp < now;
    });
  }

  /**
   * Clone the store
   */
  clone(): FlagStore {
    const store = new FlagStore(this.filePath);
    store.manifest = JSON.parse(JSON.stringify(this.manifest));
    return store;
  }

  private logAudit(action: AuditEntry['action'], flagName: string, changes: FlagChange[]): void {
    this.auditLog.push({
      action,
      flagName,
      changes,
      timestamp: new Date().toISOString(),
    });
  }
}
