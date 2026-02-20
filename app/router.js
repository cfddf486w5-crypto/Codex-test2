const routeCache = new Map();

export async function loadRoute(route, mountNode) {
  const safeRoute = route || 'dashboard';
  if (!routeCache.has(safeRoute)) {
    const res = await fetch(`pages/${safeRoute}.html`);
    if (!res.ok) throw new Error(`Page ${safeRoute} indisponible`);
    routeCache.set(safeRoute, await res.text());
  }
  mountNode.innerHTML = routeCache.get(safeRoute);
  return safeRoute;
}
