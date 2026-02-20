export function optimizeZoneOrder(moves = []) {
  return [...moves].sort((a, b) => (a.priority || 0) - (b.priority || 0) || (a.distance || 0) - (b.distance || 0));
}

export function estimatePathDistance(stops = []) {
  return stops.reduce((sum, stop) => sum + (stop.distance || 0), 0);
}
