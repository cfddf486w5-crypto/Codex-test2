export function detectAnomalies(lines = []) {
  return lines.filter((line) => {
    const qty = Number(line.qty || 0);
    return qty < 0 || qty > 10000 || (line.bins && new Set(line.bins).size > 3);
  });
}
