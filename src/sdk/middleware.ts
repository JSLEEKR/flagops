/**
 * Middleware/interceptor for flag evaluation pipeline
 */
import { EvaluationContext, EvaluationResult, FlagDefinition } from '../core/types';

export type MiddlewareFn = (
  flag: FlagDefinition,
  context: EvaluationContext,
  next: () => EvaluationResult
) => EvaluationResult;

export class MiddlewarePipeline {
  private middlewares: { name: string; fn: MiddlewareFn }[] = [];

  /**
   * Add middleware to the pipeline
   */
  use(name: string, fn: MiddlewareFn): void {
    this.middlewares.push({ name, fn });
  }

  /**
   * Remove middleware by name
   */
  remove(name: string): boolean {
    const index = this.middlewares.findIndex(m => m.name === name);
    if (index === -1) return false;
    this.middlewares.splice(index, 1);
    return true;
  }

  /**
   * Execute the middleware pipeline
   */
  execute(
    flag: FlagDefinition,
    context: EvaluationContext,
    evaluator: (flag: FlagDefinition, context: EvaluationContext) => EvaluationResult
  ): EvaluationResult {
    let index = 0;

    const next = (): EvaluationResult => {
      if (index >= this.middlewares.length) {
        return evaluator(flag, context);
      }
      const middleware = this.middlewares[index++];
      return middleware.fn(flag, context, next);
    };

    return next();
  }

  /**
   * Get middleware count
   */
  count(): number {
    return this.middlewares.length;
  }

  /**
   * Get middleware names
   */
  names(): string[] {
    return this.middlewares.map(m => m.name);
  }

  /**
   * Clear all middleware
   */
  clear(): void {
    this.middlewares = [];
  }
}

/**
 * Built-in middleware: logging
 */
export function createLoggingMiddleware(
  logger: (msg: string) => void = console.log
): MiddlewareFn {
  return (flag, context, next) => {
    const result = next();
    logger(`[flagops] ${flag.name} = ${result.value} (${result.reason})`);
    return result;
  };
}

/**
 * Built-in middleware: override map
 */
export function createOverrideMiddleware(
  overrides: Map<string, unknown>
): MiddlewareFn {
  return (flag, _context, next) => {
    if (overrides.has(flag.name)) {
      return {
        flagName: flag.name,
        value: overrides.get(flag.name) as EvaluationResult['value'],
        reason: 'default' as const,
        timestamp: new Date().toISOString(),
      };
    }
    return next();
  };
}

/**
 * Built-in middleware: track evaluations
 */
export function createTrackingMiddleware(
  tracker: (result: EvaluationResult) => void
): MiddlewareFn {
  return (_flag, _context, next) => {
    const result = next();
    tracker(result);
    return result;
  };
}
