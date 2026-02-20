import { optimizeWmsFlow } from './optimization-engine.js';

export function simulateScenario(moves = []) {
  const run = optimizeWmsFlow(moves);
  return {
    efficiencyScore: run.baseline ? ((run.gain / run.baseline) * 100).toFixed(1) : '0.0',
    ...run,
  };
}
