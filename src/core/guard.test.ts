import { scanContent, generateGuardReport, scanForUsages } from './guard';
import { FlagDefinition, FlagManifest } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Guard', () => {
  const makeFlag = (name: string): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024',
    updatedAt: '2024',
  });

  describe('scanContent', () => {
    it('should detect isEnabled calls', () => {
      const flags = scanContent(`if (client.isEnabled('dark-mode')) {}`);
      expect(flags).toContain('dark-mode');
    });

    it('should detect getValue calls', () => {
      const flags = scanContent(`const v = client.getValue('rate-limit');`);
      expect(flags).toContain('rate-limit');
    });

    it('should detect evaluate calls', () => {
      const flags = scanContent(`client.evaluate('beta-feature', ctx);`);
      expect(flags).toContain('beta-feature');
    });

    it('should detect env var references', () => {
      const flags = scanContent(`const flag = process.env.FLAGOPS_DARK_MODE;`);
      expect(flags).toContain('dark-mode');
    });

    it('should handle multiple flags in one line', () => {
      const flags = scanContent(`isEnabled('a') && isEnabled('b')`);
      expect(flags).toContain('a');
      expect(flags).toContain('b');
    });

    it('should handle double quotes', () => {
      const flags = scanContent(`isEnabled("my-flag")`);
      expect(flags).toContain('my-flag');
    });

    it('should return empty for no flags', () => {
      const flags = scanContent(`console.log('hello world');`);
      expect(flags).toHaveLength(0);
    });
  });

  describe('generateGuardReport', () => {
    it('should identify orphaned flags', () => {
      const flags = [makeFlag('used'), makeFlag('unused')];
      const usages = [{ flagName: 'used', filePath: 'a.ts', line: 1, context: '' }];
      const report = generateGuardReport(flags, usages);
      expect(report.orphanedFlags).toContain('unused');
    });

    it('should identify undefined flags', () => {
      const flags = [makeFlag('defined')];
      const usages = [{ flagName: 'undefined-flag', filePath: 'a.ts', line: 1, context: '' }];
      const report = generateGuardReport(flags, usages);
      expect(report.undefinedFlags).toContain('undefined-flag');
    });

    it('should track usage count', () => {
      const flags = [makeFlag('a')];
      const usages = [
        { flagName: 'a', filePath: 'a.ts', line: 1, context: '' },
        { flagName: 'a', filePath: 'b.ts', line: 5, context: '' },
      ];
      const report = generateGuardReport(flags, usages);
      expect(report.usedFlags.get('a')?.length).toBe(2);
      expect(report.totalUsages).toBe(2);
    });

    it('should handle empty inputs', () => {
      const report = generateGuardReport([], []);
      expect(report.orphanedFlags).toHaveLength(0);
      expect(report.undefinedFlags).toHaveLength(0);
    });
  });

  describe('scanForUsages', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagops-guard-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should scan TypeScript files', () => {
      fs.writeFileSync(path.join(tmpDir, 'app.ts'), `
        if (client.isEnabled('feature-x')) {
          doSomething();
        }
      `);
      const usages = scanForUsages(tmpDir);
      expect(usages.some(u => u.flagName === 'feature-x')).toBe(true);
    });

    it('should skip node_modules', () => {
      const nmDir = path.join(tmpDir, 'node_modules');
      fs.mkdirSync(nmDir, { recursive: true });
      fs.writeFileSync(path.join(nmDir, 'lib.ts'), `isEnabled('hidden')`);
      const usages = scanForUsages(tmpDir);
      expect(usages).toHaveLength(0);
    });

    it('should handle empty directory', () => {
      const usages = scanForUsages(tmpDir);
      expect(usages).toHaveLength(0);
    });
  });
});
