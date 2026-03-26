import { ContextProvider, mergeContexts } from './provider';

describe('ContextProvider', () => {
  let provider: ContextProvider;

  beforeEach(() => {
    provider = new ContextProvider();
  });

  describe('layers', () => {
    it('should add and merge layers', () => {
      provider.addLayer({ name: 'base', priority: 0, context: { environment: 'prod' } });
      provider.addLayer({ name: 'user', priority: 1, context: { userId: 'u1' } });
      const ctx = provider.getContext();
      expect(ctx.environment).toBe('prod');
      expect(ctx.userId).toBe('u1');
    });

    it('should respect priority order', () => {
      provider.addLayer({ name: 'low', priority: 0, context: { environment: 'staging' } });
      provider.addLayer({ name: 'high', priority: 10, context: { environment: 'prod' } });
      const ctx = provider.getContext();
      expect(ctx.environment).toBe('prod');
    });

    it('should remove layer', () => {
      provider.addLayer({ name: 'temp', priority: 0, context: { userId: 'test' } });
      expect(provider.removeLayer('temp')).toBe(true);
      expect(provider.getLayers()).toHaveLength(0);
    });

    it('should return false removing non-existent', () => {
      expect(provider.removeLayer('nope')).toBe(false);
    });

    it('should merge attributes across layers', () => {
      provider.addLayer({ name: 'a', priority: 0, context: { attributes: { plan: 'free' } } });
      provider.addLayer({ name: 'b', priority: 1, context: { attributes: { country: 'US' } } });
      const ctx = provider.getContext();
      expect(ctx.attributes?.plan).toBe('free');
      expect(ctx.attributes?.country).toBe('US');
    });

    it('should clear layers', () => {
      provider.addLayer({ name: 'a', priority: 0, context: {} });
      provider.clearLayers();
      expect(provider.getLayers()).toHaveLength(0);
    });
  });

  describe('overrides', () => {
    it('should set and get override', () => {
      provider.setOverride('flag-a', true);
      expect(provider.getOverride('flag-a')).toBe(true);
    });

    it('should check if override exists', () => {
      expect(provider.hasOverride('nope')).toBe(false);
      provider.setOverride('exists', 'yes');
      expect(provider.hasOverride('exists')).toBe(true);
    });

    it('should remove override', () => {
      provider.setOverride('temp', true);
      expect(provider.removeOverride('temp')).toBe(true);
      expect(provider.hasOverride('temp')).toBe(false);
    });

    it('should get all overrides', () => {
      provider.setOverride('a', true);
      provider.setOverride('b', false);
      const overrides = provider.getOverrides();
      expect(overrides.size).toBe(2);
    });

    it('should clear overrides', () => {
      provider.setOverride('a', true);
      provider.clearOverrides();
      expect(provider.getOverrides().size).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear everything', () => {
      provider.addLayer({ name: 'a', priority: 0, context: {} });
      provider.setOverride('b', true);
      provider.reset();
      expect(provider.getLayers()).toHaveLength(0);
      expect(provider.getOverrides().size).toBe(0);
    });
  });
});

describe('mergeContexts', () => {
  it('should merge base with overlay', () => {
    const result = mergeContexts(
      { environment: 'staging', userId: 'old' },
      { userId: 'new' }
    );
    expect(result.environment).toBe('staging');
    expect(result.userId).toBe('new');
  });

  it('should merge attributes', () => {
    const result = mergeContexts(
      { attributes: { a: 'x' } },
      { attributes: { b: 'y' } }
    );
    expect(result.attributes?.a).toBe('x');
    expect(result.attributes?.b).toBe('y');
  });

  it('should handle empty contexts', () => {
    const result = mergeContexts({}, {});
    expect(result).toEqual({});
  });
});
