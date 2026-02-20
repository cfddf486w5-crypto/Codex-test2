import { optimizeZoneOrder, estimatePathDistance } from './flow-engine.js';

export function optimizeWmsFlow(items = []) {
  const ordered = optimizeZoneOrder(items);
  const baseline = estimatePathDistance(items);
  const optimized = estimatePathDistance(ordered);
  return {
    ordered,
    baseline,
    optimized,
    gain: Math.max(0, baseline - optimized),
  };
}
