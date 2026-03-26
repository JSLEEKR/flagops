/**
 * Git integration utilities
 */
import { execSync } from 'child_process';
import { GitInfo } from '../core/types';

/**
 * Check if current directory is a git repo
 */
export function isGitRepo(cwd?: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: cwd || process.cwd(),
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current git info
 */
export function getGitInfo(cwd?: string): GitInfo | null {
  try {
    const dir = cwd || process.cwd();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: dir, stdio: 'pipe' })
      .toString()
      .trim();
    const commitHash = execSync('git rev-parse --short HEAD', { cwd: dir, stdio: 'pipe' })
      .toString()
      .trim();
    const author = execSync('git config user.name', { cwd: dir, stdio: 'pipe' })
      .toString()
      .trim();

    return {
      branch,
      commitHash,
      author,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Get the diff of a specific file
 */
export function getFileDiff(filePath: string, cwd?: string): string {
  try {
    return execSync(`git diff -- "${filePath}"`, {
      cwd: cwd || process.cwd(),
      stdio: 'pipe',
    }).toString();
  } catch {
    return '';
  }
}

/**
 * Get the log of changes to a specific file
 */
export function getFileLog(filePath: string, limit: number = 10, cwd?: string): string {
  try {
    return execSync(`git log --oneline -${limit} -- "${filePath}"`, {
      cwd: cwd || process.cwd(),
      stdio: 'pipe',
    }).toString();
  } catch {
    return '';
  }
}

/**
 * Get the blame for a specific file
 */
export function getFileBlame(filePath: string, cwd?: string): string {
  try {
    return execSync(`git blame "${filePath}"`, {
      cwd: cwd || process.cwd(),
      stdio: 'pipe',
    }).toString();
  } catch {
    return '';
  }
}
