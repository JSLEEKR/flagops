import { LifecycleHooks } from './lifecycle';

describe('LifecycleHooks', () => {
  it('should register and emit events', async () => {
    const hooks = new LifecycleHooks();
    let called = false;
    hooks.on('flag:created', () => { called = true; });
    await hooks.emit('flag:created', { flag: {} as any });
    expect(called).toBe(true);
  });

  it('should pass data to handlers', async () => {
    const hooks = new LifecycleHooks();
    let receivedName = '';
    hooks.on('flag:deleted', (data) => { receivedName = data.flagName; });
    await hooks.emit('flag:deleted', { flagName: 'test' });
    expect(receivedName).toBe('test');
  });

  it('should support multiple handlers', async () => {
    const hooks = new LifecycleHooks();
    let count = 0;
    hooks.on('store:loaded', () => { count++; });
    hooks.on('store:loaded', () => { count++; });
    await hooks.emit('store:loaded', { count: 5 });
    expect(count).toBe(2);
  });

  it('should remove handlers with off', async () => {
    const hooks = new LifecycleHooks();
    let count = 0;
    const handler = () => { count++; };
    hooks.on('flag:toggled', handler);
    hooks.off('flag:toggled', handler);
    await hooks.emit('flag:toggled', { flag: {} as any });
    expect(count).toBe(0);
  });

  it('should clear all hooks', () => {
    const hooks = new LifecycleHooks();
    hooks.on('flag:created', () => {});
    hooks.on('flag:updated', () => {});
    hooks.clear();
    expect(hooks.count('flag:created')).toBe(0);
    expect(hooks.count('flag:updated')).toBe(0);
  });

  it('should count hooks', () => {
    const hooks = new LifecycleHooks();
    expect(hooks.count('flag:created')).toBe(0);
    hooks.on('flag:created', () => {});
    expect(hooks.count('flag:created')).toBe(1);
  });

  it('should handle async handlers', async () => {
    const hooks = new LifecycleHooks();
    let result = 0;
    hooks.on('flag:evaluated', async () => {
      await new Promise(r => setTimeout(r, 10));
      result = 42;
    });
    await hooks.emit('flag:evaluated', { result: {} as any, flag: {} as any });
    expect(result).toBe(42);
  });
});
