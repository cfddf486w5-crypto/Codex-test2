export function predictRisk(history = []) {
  if (!history.length) return { ruptureRisk: 0.1, moveNeed: 0.2 };
  const avg = history.reduce((s, h) => s + (h.issues || 0), 0) / history.length;
  return {
    ruptureRisk: Math.min(0.95, avg / 10),
    moveNeed: Math.min(0.95, avg / 8),
  };
}
