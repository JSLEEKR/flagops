/**
 * Hashing utilities for deterministic rollouts
 */

/**
 * Simple string hash (DJB2 algorithm)
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Generate a consistent hash between 0 and max (exclusive)
 */
export function hashRange(str: string, max: number): number {
  return Math.abs(hashString(str)) % max;
}

/**
 * Create a simple unique ID
 */
export function generateId(prefix: string = ''): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}
