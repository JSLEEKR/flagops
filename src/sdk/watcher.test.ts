import { FlagWatcher } from './watcher';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FlagWatcher', () => {
  let tmpDir: string;
  let tmpFile: string;
  let watcher: FlagWatcher;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flagops-watch-'));
    tmpFile = path.join(tmpDir, '.flagops.yml');
    watcher = new FlagWatcher(tmpFile);
  });

  afterEach(() => {
    watcher.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should detect file creation', () => {
    // File doesn't exist yet
    watcher.check(); // Initialize state

    // Create file
    fs.writeFileSync(tmpFile, 'version: "1.0"\nflags: []');
    const event = watcher.check();
    expect(event).not.toBeNull();
    expect(event!.type).toBe('created');
  });

  it('should detect file changes', () => {
    fs.writeFileSync(tmpFile, 'version: "1.0"\nflags: []');
    watcher.check(); // Initialize

    fs.writeFileSync(tmpFile, 'version: "1.0"\nflags:\n  - name: new');
    const event = watcher.check();
    expect(event).not.toBeNull();
    expect(event!.type).toBe('changed');
  });

  it('should detect file deletion', () => {
    fs.writeFileSync(tmpFile, 'version: "1.0"');
    watcher.check(); // Initialize

    fs.unlinkSync(tmpFile);
    const event = watcher.check();
    expect(event).not.toBeNull();
    expect(event!.type).toBe('deleted');
  });

  it('should return null when no change', () => {
    fs.writeFileSync(tmpFile, 'version: "1.0"');
    watcher.check(); // Initialize
    const event = watcher.check();
    expect(event).toBeNull();
  });

  it('should notify callbacks', () => {
    let notified = false;
    watcher.onChange(() => { notified = true; });

    fs.writeFileSync(tmpFile, 'v1');
    watcher.check();
    fs.writeFileSync(tmpFile, 'v2');
    watcher.check();

    expect(notified).toBe(true);
  });

  it('should remove callbacks', () => {
    let count = 0;
    const cb = () => { count++; };
    watcher.onChange(cb);
    watcher.removeCallback(cb);

    fs.writeFileSync(tmpFile, 'v1');
    watcher.check();
    fs.writeFileSync(tmpFile, 'v2');
    watcher.check();

    expect(count).toBe(0);
  });

  it('should start and stop', () => {
    watcher.start(60000);
    expect(watcher.isActive()).toBe(true);
    watcher.stop();
    expect(watcher.isActive()).toBe(false);
  });

  it('should track callback count', () => {
    expect(watcher.getCallbackCount()).toBe(0);
    watcher.onChange(() => {});
    expect(watcher.getCallbackCount()).toBe(1);
  });

  it('should handle callback errors gracefully', () => {
    watcher.onChange(() => { throw new Error('boom'); });
    fs.writeFileSync(tmpFile, 'v1');
    watcher.check();
    fs.writeFileSync(tmpFile, 'v2');
    expect(() => watcher.check()).not.toThrow();
  });
});
