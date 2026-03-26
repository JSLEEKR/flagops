/**
 * Flag scheduling — schedule flag activations and deactivations
 */
import { FlagDefinition } from './types';

export interface Schedule {
  flagName: string;
  action: 'enable' | 'disable' | 'archive' | 'update';
  scheduledAt: string;
  executed: boolean;
  updates?: Partial<FlagDefinition>;
}

export class FlagScheduler {
  private schedules: Schedule[] = [];

  /**
   * Schedule a flag action
   */
  schedule(schedule: Omit<Schedule, 'executed'>): void {
    this.schedules.push({ ...schedule, executed: false });
  }

  /**
   * Get pending schedules
   */
  getPending(): Schedule[] {
    return this.schedules.filter(s => !s.executed);
  }

  /**
   * Get due schedules (past scheduled time)
   */
  getDue(now: Date = new Date()): Schedule[] {
    return this.schedules.filter(s => !s.executed && new Date(s.scheduledAt) <= now);
  }

  /**
   * Execute due schedules against flags
   */
  executeDue(flags: FlagDefinition[], now: Date = new Date()): string[] {
    const executed: string[] = [];
    const due = this.getDue(now);

    for (const schedule of due) {
      const flag = flags.find(f => f.name === schedule.flagName);
      if (!flag) continue;

      switch (schedule.action) {
        case 'enable':
          flag.status = 'active';
          break;
        case 'disable':
          flag.status = 'inactive';
          break;
        case 'archive':
          flag.status = 'archived';
          break;
        case 'update':
          if (schedule.updates) {
            Object.assign(flag, schedule.updates);
          }
          break;
      }

      flag.updatedAt = now.toISOString();
      schedule.executed = true;
      executed.push(schedule.flagName);
    }

    return executed;
  }

  /**
   * Remove executed schedules
   */
  cleanup(): number {
    const before = this.schedules.length;
    this.schedules = this.schedules.filter(s => !s.executed);
    return before - this.schedules.length;
  }

  /**
   * Get all schedules
   */
  getAll(): Schedule[] {
    return [...this.schedules];
  }

  /**
   * Cancel a schedule for a flag
   */
  cancel(flagName: string): boolean {
    const index = this.schedules.findIndex(s => s.flagName === flagName && !s.executed);
    if (index === -1) return false;
    this.schedules.splice(index, 1);
    return true;
  }

  /**
   * Clear all schedules
   */
  clear(): void {
    this.schedules = [];
  }

  /**
   * Export schedules to JSON
   */
  export(): string {
    return JSON.stringify(this.schedules, null, 2);
  }

  /**
   * Import schedules from JSON
   */
  import(data: string): void {
    this.schedules = JSON.parse(data);
  }
}
