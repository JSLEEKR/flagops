/**
 * Advanced search and indexing for flag definitions
 */
import { FlagDefinition } from './types';

export interface SearchResult {
  flag: FlagDefinition;
  score: number;
  matches: string[];
}

export interface SearchOptions {
  fields?: ('name' | 'description' | 'tags' | 'owner')[];
  caseSensitive?: boolean;
  fuzzy?: boolean;
  maxResults?: number;
}

/**
 * Search flags with relevance scoring
 */
export function searchFlags(
  flags: FlagDefinition[],
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const fields = options.fields || ['name', 'description', 'tags', 'owner'];
  const caseSensitive = options.caseSensitive || false;
  const maxResults = options.maxResults || 50;
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  const results: SearchResult[] = [];

  for (const flag of flags) {
    let score = 0;
    const matches: string[] = [];

    if (fields.includes('name')) {
      const name = caseSensitive ? flag.name : flag.name.toLowerCase();
      if (name === searchQuery) {
        score += 100;
        matches.push('name (exact)');
      } else if (name.startsWith(searchQuery)) {
        score += 75;
        matches.push('name (prefix)');
      } else if (name.includes(searchQuery)) {
        score += 50;
        matches.push('name (contains)');
      } else if (options.fuzzy && fuzzyMatch(name, searchQuery)) {
        score += 25;
        matches.push('name (fuzzy)');
      }
    }

    if (fields.includes('description') && flag.description) {
      const desc = caseSensitive ? flag.description : flag.description.toLowerCase();
      if (desc.includes(searchQuery)) {
        score += 30;
        matches.push('description');
      }
    }

    if (fields.includes('tags') && flag.tags) {
      for (const tag of flag.tags) {
        const t = caseSensitive ? tag : tag.toLowerCase();
        if (t === searchQuery) {
          score += 60;
          matches.push(`tag:${tag} (exact)`);
        } else if (t.includes(searchQuery)) {
          score += 40;
          matches.push(`tag:${tag}`);
        }
      }
    }

    if (fields.includes('owner') && flag.owner) {
      const owner = caseSensitive ? flag.owner : flag.owner.toLowerCase();
      if (owner === searchQuery) {
        score += 50;
        matches.push('owner (exact)');
      } else if (owner.includes(searchQuery)) {
        score += 30;
        matches.push('owner');
      }
    }

    if (score > 0) {
      results.push({ flag, score, matches });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

/**
 * Simple fuzzy matching — checks if characters appear in order
 */
export function fuzzyMatch(text: string, pattern: string): boolean {
  let patternIdx = 0;
  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === pattern.length;
}

/**
 * Build a tag index for fast lookup
 */
export function buildTagIndex(flags: FlagDefinition[]): Map<string, FlagDefinition[]> {
  const index = new Map<string, FlagDefinition[]>();
  for (const flag of flags) {
    if (flag.tags) {
      for (const tag of flag.tags) {
        const existing = index.get(tag) || [];
        existing.push(flag);
        index.set(tag, existing);
      }
    }
  }
  return index;
}

/**
 * Build an owner index
 */
export function buildOwnerIndex(flags: FlagDefinition[]): Map<string, FlagDefinition[]> {
  const index = new Map<string, FlagDefinition[]>();
  for (const flag of flags) {
    if (flag.owner) {
      const existing = index.get(flag.owner) || [];
      existing.push(flag);
      index.set(flag.owner, existing);
    }
  }
  return index;
}

/**
 * Group flags by a field
 */
export function groupBy(
  flags: FlagDefinition[],
  field: 'status' | 'type' | 'owner'
): Map<string, FlagDefinition[]> {
  const groups = new Map<string, FlagDefinition[]>();
  for (const flag of flags) {
    const key = flag[field] || 'unknown';
    const existing = groups.get(key) || [];
    existing.push(flag);
    groups.set(key, existing);
  }
  return groups;
}
