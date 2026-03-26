/**
 * Multi-file flag discovery — scan directories for flag manifests
 */
import * as fs from 'fs';
import * as path from 'path';
import { FlagManifest, FlagDefinition } from './types';
import { parseContent, detectFormat } from './parser';

export interface DiscoveryResult {
  filePath: string;
  manifest: FlagManifest;
  flagCount: number;
}

export interface DiscoveryOptions {
  patterns?: string[];
  recursive?: boolean;
  maxDepth?: number;
}

const DEFAULT_PATTERNS = ['.flagops.yml', '.flagops.yaml', '.flagops.json', 'flagops.yml', 'flagops.yaml', 'flagops.json'];

/**
 * Discover flag manifest files in a directory
 */
export function discoverManifests(
  rootDir: string,
  options: DiscoveryOptions = {}
): DiscoveryResult[] {
  const patterns = options.patterns || DEFAULT_PATTERNS;
  const recursive = options.recursive !== false;
  const maxDepth = options.maxDepth ?? 5;
  const results: DiscoveryResult[] = [];

  scanDirectory(rootDir, patterns, recursive, maxDepth, 0, results);
  return results;
}

function scanDirectory(
  dir: string,
  patterns: string[],
  recursive: boolean,
  maxDepth: number,
  currentDepth: number,
  results: DiscoveryResult[]
): void {
  if (currentDepth > maxDepth) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && matchesPattern(entry.name, patterns)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const format = detectFormat(fullPath);
        const manifest = parseContent(content, format);
        results.push({
          filePath: fullPath,
          manifest,
          flagCount: manifest.flags.length,
        });
      } catch {
        // Skip unreadable files
      }
    }

    if (entry.isDirectory() && recursive && !isIgnoredDir(entry.name)) {
      scanDirectory(fullPath, patterns, recursive, maxDepth, currentDepth + 1, results);
    }
  }
}

function matchesPattern(filename: string, patterns: string[]): boolean {
  return patterns.some(p => {
    if (p.includes('*')) {
      const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
      return regex.test(filename);
    }
    return filename === p;
  });
}

function isIgnoredDir(name: string): boolean {
  const ignored = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__pycache__'];
  return ignored.includes(name);
}

/**
 * Merge all discovered manifests into one
 */
export function mergeDiscovered(results: DiscoveryResult[]): FlagManifest {
  const allFlags: FlagDefinition[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    for (const flag of result.manifest.flags) {
      if (!seen.has(flag.name)) {
        allFlags.push(flag);
        seen.add(flag.name);
      }
    }
  }

  return { version: '1.0', flags: allFlags };
}

/**
 * Find flags that exist in multiple files (potential conflicts)
 */
export function findDuplicates(results: DiscoveryResult[]): Map<string, string[]> {
  const flagFiles = new Map<string, string[]>();

  for (const result of results) {
    for (const flag of result.manifest.flags) {
      const files = flagFiles.get(flag.name) || [];
      files.push(result.filePath);
      flagFiles.set(flag.name, files);
    }
  }

  // Only return duplicates
  const duplicates = new Map<string, string[]>();
  for (const [name, files] of flagFiles) {
    if (files.length > 1) {
      duplicates.set(name, files);
    }
  }

  return duplicates;
}
