/**
 * Lifecycle hooks for flag events
 */
import { FlagDefinition, EvaluationResult, FlagChange } from '../core/types';

export type HookHandler<T = void> = (data: T) => void | Promise<void>;

interface FlagEventData {
  flag: FlagDefinition;
  changes?: FlagChange[];
}

interface EvalEventData {
  result: EvaluationResult;
  flag: FlagDefinition;
}

export interface HookRegistry {
  'flag:created': HookHandler<FlagEventData>[];
  'flag:updated': HookHandler<FlagEventData>[];
  'flag:deleted': HookHandler<{ flagName: string }>[];
  'flag:toggled': HookHandler<FlagEventData>[];
  'flag:evaluated': HookHandler<EvalEventData>[];
  'flag:expired': HookHandler<FlagEventData>[];
  'store:loaded': HookHandler<{ count: number }>[];
  'store:saved': HookHandler<{ filePath: string }>[];
}

export type HookEvent = keyof HookRegistry;

export class LifecycleHooks {
  private hooks: HookRegistry = {
    'flag:created': [],
    'flag:updated': [],
    'flag:deleted': [],
    'flag:toggled': [],
    'flag:evaluated': [],
    'flag:expired': [],
    'store:loaded': [],
    'store:saved': [],
  };

  /**
   * Register a hook
   */
  on<E extends HookEvent>(event: E, handler: HookRegistry[E][number]): void {
    (this.hooks[event] as HookHandler<unknown>[]).push(handler as HookHandler<unknown>);
  }

  /**
   * Remove a hook
   */
  off<E extends HookEvent>(event: E, handler: HookRegistry[E][number]): void {
    const handlers = this.hooks[event] as HookHandler<unknown>[];
    const index = handlers.indexOf(handler as HookHandler<unknown>);
    if (index !== -1) handlers.splice(index, 1);
  }

  /**
   * Emit an event
   */
  async emit<E extends HookEvent>(event: E, data: Parameters<HookRegistry[E][number]>[0]): Promise<void> {
    const handlers = this.hooks[event] as HookHandler<unknown>[];
    for (const handler of handlers) {
      await handler(data);
    }
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    for (const key of Object.keys(this.hooks) as HookEvent[]) {
      this.hooks[key] = [] as any;
    }
  }

  /**
   * Get hook count for an event
   */
  count(event: HookEvent): number {
    return this.hooks[event].length;
  }
}
