import { isGitRepo, getGitInfo } from './git';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('Git Utils', () => {
  describe('isGitRepo', () => {
    it('should return true for a git repo', () => {
      // The project root is a git repo
      expect(isGitRepo(process.cwd())).toBe(true);
    });

    it('should return false for temp directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagops-git-'));
      try {
        expect(isGitRepo(tmpDir)).toBe(false);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('getGitInfo', () => {
    it('should return info for git repo', () => {
      const info = getGitInfo(process.cwd());
      if (info) {
        expect(info.branch).toBeDefined();
        expect(info.commitHash).toBeDefined();
        expect(info.author).toBeDefined();
        expect(info.timestamp).toBeDefined();
      }
    });

    it('should return null for non-git directory', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagops-git2-'));
      try {
        const info = getGitInfo(tmpDir);
        expect(info).toBeNull();
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
