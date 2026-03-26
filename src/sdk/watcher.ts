/**
 * Flag watcher — detect file changes and notify subscribers
 */
import * as fs from 'fs';
import * as crypto from 'crypto';

export type WatchCallback = (event: WatchEvent) => void;

export interface WatchEvent {
  type: 'changed' | 'deleted' | 'created';
  filePath: string;
  timestamp: string;
}

export class FlagWatcher {
  private filePath: string;
  private callbacks: WatchCallback[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private lastHash: string | null = null;
  private lastExists: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Start watching for changes
   */
  start(intervalMs: number = 1000): void {
    this.stop();
    this.lastHash = this.getFileHash();
    this.lastExists = fs.existsSync(this.filePath);

    this.checkInterval = setInterval(() => {
      this.check();
    }, intervalMs);
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Register a change callback
   */
  onChange(callback: WatchCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback
   */
  removeCallback(callback: WatchCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) this.callbacks.splice(index, 1);
  }

  /**
   * Check for changes manually
   */
  check(): WatchEvent | null {
    const exists = fs.existsSync(this.filePath);
    const currentHash = this.getFileHash();
    const now = new Date().toISOString();

    let event: WatchEvent | null = null;

    if (!this.lastExists && exists) {
      event = { type: 'created', filePath: this.filePath, timestamp: now };
    } else if (this.lastExists && !exists) {
      event = { type: 'deleted', filePath: this.filePath, timestamp: now };
    } else if (exists && currentHash !== this.lastHash) {
      event = { type: 'changed', filePath: this.filePath, timestamp: now };
    }

    this.lastExists = exists;
    this.lastHash = currentHash;

    if (event) {
      this.notify(event);
    }

    return event;
  }

  /**
   * Get whether watcher is active
   */
  isActive(): boolean {
    return this.checkInterval !== null;
  }

  /**
   * Get callback count
   */
  getCallbackCount(): number {
    return this.callbacks.length;
  }

  private getFileHash(): string | null {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private notify(event: WatchEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}
