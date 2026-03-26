import { MiddlewarePipeline, createLoggingMiddleware, createOverrideMiddleware, createTrackingMiddleware } from './middleware';
import { FlagDefinition, EvaluationContext, EvaluationResult } from '../core/types';
import { evaluateFlag } from '../core/evaluator';

describe('Middleware', () => {
  const makeFlag = (name: string): FlagDefinition => ({
    name,
    status: 'active',
    type: 'boolean',
    defaultValue: true,
    createdAt: '2024',
    updatedAt: '2024',
  });

  describe('MiddlewarePipeline', () => {
    it('should execute without middleware', () => {
      const pipeline = new MiddlewarePipeline();
      const result = pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(result.value).toBe(true);
    });

    it('should execute middleware in order', () => {
      const pipeline = new MiddlewarePipeline();
      const order: string[] = [];

      pipeline.use('first', (_f, _c, next) => {
        order.push('first');
        return next();
      });
      pipeline.use('second', (_f, _c, next) => {
        order.push('second');
        return next();
      });

      pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(order).toEqual(['first', 'second']);
    });

    it('should allow middleware to modify result', () => {
      const pipeline = new MiddlewarePipeline();
      pipeline.use('override', (_f, _c, next) => {
        const result = next();
        return { ...result, value: false };
      });

      const result = pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(result.value).toBe(false);
    });

    it('should allow middleware to short-circuit', () => {
      const pipeline = new MiddlewarePipeline();
      let called = false;

      pipeline.use('short', (flag) => ({
        flagName: flag.name,
        value: 'intercepted',
        reason: 'default',
        timestamp: new Date().toISOString(),
      }));
      pipeline.use('never', (_f, _c, next) => {
        called = true;
        return next();
      });

      const result = pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(result.value).toBe('intercepted');
      expect(called).toBe(false);
    });

    it('should remove middleware', () => {
      const pipeline = new MiddlewarePipeline();
      pipeline.use('temp', (_f, _c, next) => next());
      expect(pipeline.remove('temp')).toBe(true);
      expect(pipeline.count()).toBe(0);
    });

    it('should return false removing non-existent', () => {
      const pipeline = new MiddlewarePipeline();
      expect(pipeline.remove('nope')).toBe(false);
    });

    it('should list names', () => {
      const pipeline = new MiddlewarePipeline();
      pipeline.use('a', (_f, _c, next) => next());
      pipeline.use('b', (_f, _c, next) => next());
      expect(pipeline.names()).toEqual(['a', 'b']);
    });

    it('should clear all', () => {
      const pipeline = new MiddlewarePipeline();
      pipeline.use('a', (_f, _c, next) => next());
      pipeline.clear();
      expect(pipeline.count()).toBe(0);
    });
  });

  describe('createLoggingMiddleware', () => {
    it('should log evaluation', () => {
      const logs: string[] = [];
      const middleware = createLoggingMiddleware((msg) => logs.push(msg));
      const pipeline = new MiddlewarePipeline();
      pipeline.use('log', middleware);
      pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(logs.length).toBe(1);
      expect(logs[0]).toContain('test');
    });
  });

  describe('createOverrideMiddleware', () => {
    it('should override flag value', () => {
      const overrides = new Map<string, unknown>([['test', false]]);
      const middleware = createOverrideMiddleware(overrides);
      const pipeline = new MiddlewarePipeline();
      pipeline.use('override', middleware);
      const result = pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(result.value).toBe(false);
    });

    it('should pass through non-overridden flags', () => {
      const overrides = new Map<string, unknown>();
      const middleware = createOverrideMiddleware(overrides);
      const pipeline = new MiddlewarePipeline();
      pipeline.use('override', middleware);
      const result = pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(result.value).toBe(true);
    });
  });

  describe('createTrackingMiddleware', () => {
    it('should track evaluations', () => {
      const tracked: EvaluationResult[] = [];
      const middleware = createTrackingMiddleware((r) => tracked.push(r));
      const pipeline = new MiddlewarePipeline();
      pipeline.use('track', middleware);
      pipeline.execute(makeFlag('test'), {}, evaluateFlag);
      expect(tracked).toHaveLength(1);
    });
  });
});
