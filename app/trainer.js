import { putRecord, getAll } from './storage.js';

export async function incrementalTrain(feedback = { success: true, weightDelta: 0.05 }) {
  const weights = (await getAll('weights'))[0] || { id: 1, value: 1 };
  const delta = feedback.success ? feedback.weightDelta : -feedback.weightDelta;
  const value = Math.max(0.1, Math.min(3, weights.value + delta));
  await putRecord('weights', { id: 1, value });
  return value;
}

export function trainingMatrix(samples = 12) {
  const tp = Math.floor(samples * 0.55);
  const tn = Math.floor(samples * 0.25);
  const fp = Math.floor(samples * 0.1);
  const fn = samples - tp - tn - fp;
  return { tp, tn, fp, fn, accuracy: ((tp + tn) / samples).toFixed(2) };
}
