/**
 * Context provider — manage evaluation context with inheritance and overrides
 */
import { EvaluationContext, FlagValue } from '../core/types';

export interface ContextLayer {
  name: string;
  priority: number;
  context: Partial<EvaluationContext>;
}

export class ContextProvider {
  private layers: ContextLayer[] = [];
  private overrides: Map<string, FlagValue> = new Map();

  /**
   * Add a context layer
   */
  addLayer(layer: ContextLayer): void {
    this.layers.push(layer);
    this.layers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Remove a context layer by name
   */
  removeLayer(name: string): boolean {
    const index = this.layers.findIndex(l => l.name === name);
    if (index === -1) return false;
    this.layers.splice(index, 1);
    return true;
  }

  /**
   * Get the merged context from all layers
   */
  getContext(): EvaluationContext {
    let merged: EvaluationContext = {};

    for (const layer of this.layers) {
      merged = mergeContexts(merged, layer.context);
    }

    return merged;
  }

  /**
   * Set a flag override (bypasses evaluation)
   */
  setOverride(flagName: string, value: FlagValue): void {
    this.overrides.set(flagName, value);
  }

  /**
   * Remove a flag override
   */
  removeOverride(flagName: string): boolean {
    return this.overrides.delete(flagName);
  }

  /**
   * Get a flag override value
   */
  getOverride(flagName: string): FlagValue | undefined {
    return this.overrides.get(flagName);
  }

  /**
   * Check if a flag has an override
   */
  hasOverride(flagName: string): boolean {
    return this.overrides.has(flagName);
  }

  /**
   * Get all overrides
   */
  getOverrides(): Map<string, FlagValue> {
    return new Map(this.overrides);
  }

  /**
   * Clear all overrides
   */
  clearOverrides(): void {
    this.overrides.clear();
  }

  /**
   * Get all layers
   */
  getLayers(): ContextLayer[] {
    return [...this.layers];
  }

  /**
   * Clear all layers
   */
  clearLayers(): void {
    this.layers = [];
  }

  /**
   * Reset everything
   */
  reset(): void {
    this.layers = [];
    this.overrides.clear();
  }
}

/**
 * Merge two evaluation contexts
 */
export function mergeContexts(base: EvaluationContext, overlay: Partial<EvaluationContext>): EvaluationContext {
  const merged: EvaluationContext = { ...base };

  if (overlay.environment !== undefined) {
    merged.environment = overlay.environment;
  }

  if (overlay.userId !== undefined) {
    merged.userId = overlay.userId;
  }

  if (overlay.attributes) {
    merged.attributes = { ...merged.attributes, ...overlay.attributes };
  }

  return merged;
}
