import { FlagScheduler } from './scheduling';
import { FlagDefinition } from './types';

describe('FlagScheduler', () => {
  let scheduler: FlagScheduler;

  const makeFlag = (name: string): FlagDefinition => ({
    name,
    status: 'inactive',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  });

  beforeEach(() => {
    scheduler = new FlagScheduler();
  });

  it('should schedule and retrieve pending', () => {
    scheduler.schedule({ flagName: 'a', action: 'enable', scheduledAt: '2099-01-01T00:00:00Z' });
    expect(scheduler.getPending()).toHaveLength(1);
  });

  it('should get due schedules', () => {
    scheduler.schedule({ flagName: 'a', action: 'enable', scheduledAt: '2020-01-01T00:00:00Z' });
    scheduler.schedule({ flagName: 'b', action: 'enable', scheduledAt: '2099-01-01T00:00:00Z' });
    const due = scheduler.getDue();
    expect(due).toHaveLength(1);
    expect(due[0].flagName).toBe('a');
  });

  it('should execute due schedules', () => {
    const flags = [makeFlag('a'), makeFlag('b')];
    scheduler.schedule({ flagName: 'a', action: 'enable', scheduledAt: '2020-01-01T00:00:00Z' });
    const executed = scheduler.executeDue(flags);
    expect(executed).toContain('a');
    expect(flags[0].status).toBe('active');
  });

  it('should handle disable action', () => {
    const flags = [makeFlag('a')];
    flags[0].status = 'active';
    scheduler.schedule({ flagName: 'a', action: 'disable', scheduledAt: '2020-01-01T00:00:00Z' });
    scheduler.executeDue(flags);
    expect(flags[0].status).toBe('inactive');
  });

  it('should handle archive action', () => {
    const flags = [makeFlag('a')];
    scheduler.schedule({ flagName: 'a', action: 'archive', scheduledAt: '2020-01-01T00:00:00Z' });
    scheduler.executeDue(flags);
    expect(flags[0].status).toBe('archived');
  });

  it('should handle update action', () => {
    const flags = [makeFlag('a')];
    scheduler.schedule({
      flagName: 'a',
      action: 'update',
      scheduledAt: '2020-01-01T00:00:00Z',
      updates: { description: 'updated' },
    });
    scheduler.executeDue(flags);
    expect(flags[0].description).toBe('updated');
  });

  it('should cleanup executed schedules', () => {
    scheduler.schedule({ flagName: 'a', action: 'enable', scheduledAt: '2020-01-01T00:00:00Z' });
    scheduler.executeDue([makeFlag('a')]);
    const cleaned = scheduler.cleanup();
    expect(cleaned).toBe(1);
    expect(scheduler.getAll()).toHaveLength(0);
  });

  it('should cancel pending schedule', () => {
    scheduler.schedule({ flagName: 'a', action: 'enable', scheduledAt: '2099-01-01T00:00:00Z' });
    expect(scheduler.cancel('a')).toBe(true);
    expect(scheduler.getPending()).toHaveLength(0);
  });

  it('should return false canceling non-existent', () => {
    expect(scheduler.cancel('nope')).toBe(false);
  });

  it('should clear all schedules', () => {
    scheduler.schedule({ flagName: 'a', action: 'enable', scheduledAt: '2099-01-01T00:00:00Z' });
    scheduler.clear();
    expect(scheduler.getAll()).toHaveLength(0);
  });

  it('should export/import schedules', () => {
    scheduler.schedule({ flagName: 'a', action: 'enable', scheduledAt: '2099-01-01T00:00:00Z' });
    const json = scheduler.export();

    const scheduler2 = new FlagScheduler();
    scheduler2.import(json);
    expect(scheduler2.getAll()).toHaveLength(1);
  });

  it('should skip missing flags during execution', () => {
    scheduler.schedule({ flagName: 'missing', action: 'enable', scheduledAt: '2020-01-01T00:00:00Z' });
    const executed = scheduler.executeDue([]);
    expect(executed).toHaveLength(0);
  });
});
