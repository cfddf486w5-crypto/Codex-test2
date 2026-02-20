import { getConfig, setConfig } from './storage.js';

export function runNeuralLite(features = []) {
  const weights = getConfig('nn_weights', [0.5, -0.2, 0.8, 0.3]);
  const z = features.reduce((sum, f, i) => sum + f * (weights[i] || 0), 0);
  return 1 / (1 + Math.exp(-z));
}

export function trainNeuralLite(dataset = []) {
  let weights = getConfig('nn_weights', [0.5, -0.2, 0.8, 0.3]);
  dataset.forEach(({ x, y }) => {
    const pred = runNeuralLite(x);
    const err = y - pred;
    weights = weights.map((w, i) => w + 0.05 * err * (x[i] || 0));
  });
  setConfig('nn_weights', weights);
  return weights;
}
