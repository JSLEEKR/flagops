/**
 * Flag guard — scan code for flag usage and detect stale/orphaned flags
 */
import * as fs from 'fs';
import * as path from 'path';
import { FlagDefinition } from './types';

export interface FlagUsage {
  flagName: string;
  filePath: string;
  line: number;
  context: string;
}

export interface GuardReport {
  usedFlags: Map<string, FlagUsage[]>;
  orphanedFlags: string[];
  undefinedFlags: string[];
  totalUsages: number;
}

const FLAG_PATTERNS = [
  /isEnabled\(['"`]([^'"`]+)['"`]\)/g,
  /getValue\(['"`]([^'"`]+)['"`]\)/g,
  /evaluate\(['"`]([^'"`]+)['"`]\)/g,
  /getValueWithDefault\(['"`]([^'"`]+)['"`]\)/g,
  /flagops\.eval\s+['"`]?([a-zA-Z][a-zA-Z0-9_.-]*)['"`]?/g,
  /FLAGOPS_([A-Z_]+)/g,
  /FLAG_([A-Z_]+)/g,
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rb', '.java', '.rs'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '__pycache__', '.next'];

/**
 * Scan source files for flag usage
 */
export function scanForUsages(
  rootDir: string,
  maxDepth: number = 10
): FlagUsage[] {
  const usages: FlagUsage[] = [];
  scanDir(rootDir, maxDepth, 0, usages);
  return usages;
}

function scanDir(dir: string, maxDepth: number, depth: number, usages: FlagUsage[]): void {
  if (depth > maxDepth) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !IGNORE_DIRS.includes(entry.name)) {
      scanDir(fullPath, maxDepth, depth + 1, usages);
    } else if (entry.isFile() && CODE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      scanFile(fullPath, usages);
    }
  }
}

function scanFile(filePath: string, usages: FlagUsage[]): void {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return;
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of FLAG_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(lines[i])) !== null) {
        const flagName = match[1].toLowerCase().replace(/_/g, '-');
        usages.push({
          flagName,
          filePath,
          line: i + 1,
          context: lines[i].trim(),
        });
      }
    }
  }
}

/**
 * Generate a guard report comparing defined flags vs usage
 */
export function generateGuardReport(
  definedFlags: FlagDefinition[],
  usages: FlagUsage[]
): GuardReport {
  const definedNames = new Set(definedFlags.map(f => f.name));
  const usedFlags = new Map<string, FlagUsage[]>();

  for (const usage of usages) {
    const existing = usedFlags.get(usage.flagName) || [];
    existing.push(usage);
    usedFlags.set(usage.flagName, existing);
  }

  const usedNames = new Set(usedFlags.keys());

  const orphanedFlags = [...definedNames].filter(n => !usedNames.has(n));
  const undefinedFlags = [...usedNames].filter(n => !definedNames.has(n));

  return {
    usedFlags,
    orphanedFlags,
    undefinedFlags,
    totalUsages: usages.length,
  };
}

/**
 * Scan content string for flag references (for testing)
 */
export function scanContent(content: string): string[] {
  const flags = new Set<string>();
  const lines = content.split('\n');

  for (const line of lines) {
    for (const pattern of FLAG_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        flags.add(match[1].toLowerCase().replace(/_/g, '-'));
      }
    }
  }

  return [...flags];
}
