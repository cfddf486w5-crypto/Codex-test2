const routeCache = new Map();
const scrollMemory = new Map();

export async function loadRoute(route, mountNode) {
  const safeRoute = route || 'ai-center';
  const previous = mountNode.dataset.route;

  if (previous) {
    scrollMemory.set(previous, mountNode.scrollTop);
  }

  if (!routeCache.has(safeRoute)) {
    const res = await fetch(`pages/${safeRoute}.html`);
    if (!res.ok) throw new Error(`Page ${safeRoute} indisponible`);
    routeCache.set(safeRoute, await res.text());
  }

  mountNode.classList.add('route-leave');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  mountNode.innerHTML = routeCache.get(safeRoute);
  mountNode.dataset.route = safeRoute;
  mountNode.classList.remove('route-leave');
  mountNode.classList.add('route-enter');

  const rememberedScroll = scrollMemory.get(safeRoute) ?? 0;
  mountNode.scrollTop = rememberedScroll;

  requestAnimationFrame(() => mountNode.classList.remove('route-enter'));
  return safeRoute;
}
