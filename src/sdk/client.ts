/**
 * SDK client for runtime flag evaluation
 */
import { FlagStore } from '../core/store';
import { EvaluationContext, EvaluationResult, FlagValue, FlagDefinition } from '../core/types';
import { LifecycleHooks } from '../hooks/lifecycle';

export interface ClientOptions {
  filePath?: string;
  refreshInterval?: number;
  defaultContext?: EvaluationContext;
  onError?: (error: Error) => void;
}

export class FlagOpsClient {
  private store: FlagStore;
  private hooks: LifecycleHooks;
  private options: ClientOptions;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private cache: Map<string, { result: EvaluationResult; expiry: number }> = new Map();
  private cacheTtl: number = 5000;

  constructor(options: ClientOptions = {}) {
    this.options = options;
    this.store = new FlagStore(options.filePath);
    this.hooks = new LifecycleHooks();

    try {
      this.store.load();
    } catch (err) {
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Check if a boolean flag is enabled
   */
  isEnabled(flagName: string, context?: EvaluationContext): boolean {
    const result = this.evaluate(flagName, context);
    return result.value === true;
  }

  /**
   * Get a flag value
   */
  getValue<T extends FlagValue>(flagName: string, context?: EvaluationContext): T {
    const result = this.evaluate(flagName, context);
    return result.value as T;
  }

  /**
   * Get a flag value with a fallback default
   */
  getValueWithDefault<T extends FlagValue>(flagName: string, defaultValue: T, context?: EvaluationContext): T {
    const result = this.evaluate(flagName, context);
    if (result.reason === 'not-found') return defaultValue;
    return result.value as T;
  }

  /**
   * Evaluate a flag with full result
   */
  evaluate(flagName: string, context?: EvaluationContext): EvaluationResult {
    const mergedContext = { ...this.options.defaultContext, ...context };
    const cacheKey = `${flagName}:${JSON.stringify(mergedContext)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    const result = this.store.evaluate(flagName, mergedContext);

    // Cache result
    this.cache.set(cacheKey, { result, expiry: Date.now() + this.cacheTtl });

    return result;
  }

  /**
   * Evaluate all flags
   */
  evaluateAll(context?: EvaluationContext): Map<string, EvaluationResult> {
    const mergedContext = { ...this.options.defaultContext, ...context };
    return this.store.evaluateAll(mergedContext);
  }

  /**
   * Get all flag definitions
   */
  getFlags(): FlagDefinition[] {
    return this.store.getFlags();
  }

  /**
   * Get a single flag definition
   */
  getFlag(name: string): FlagDefinition | undefined {
    return this.store.getFlag(name);
  }

  /**
   * Register a lifecycle hook
   */
  get on() {
    return this.hooks.on.bind(this.hooks);
  }

  /**
   * Reload flags from file
   */
  reload(): void {
    this.cache.clear();
    this.store.load();
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh(intervalMs: number = 30000): void {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      try {
        this.reload();
      } catch (err) {
        if (this.options.onError) {
          this.options.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }, intervalMs);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Set cache TTL
   */
  setCacheTtl(ms: number): void {
    this.cacheTtl = ms;
  }

  /**
   * Clear the evaluation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Destroy the client
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.cache.clear();
    this.hooks.clear();
  }

  /**
   * Get the underlying store
   */
  getStore(): FlagStore {
    return this.store;
  }
}

/**
 * Create a client instance
 */
export function createClient(options?: ClientOptions): FlagOpsClient {
  return new FlagOpsClient(options);
}
