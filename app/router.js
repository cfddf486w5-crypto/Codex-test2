const routeCache = new Map();
const scrollMemory = new Map();
const focusMemory = new Map();

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rememberFocus(route) {
  const active = document.activeElement;
  if (!route || !(active instanceof HTMLElement)) return;
  if (!active.id) return;
  focusMemory.set(route, `#${active.id}`);
}

export async function loadRoute(route, mountNode) {
  const safeRoute = route || 'ai-center';
  const previous = mountNode.dataset.route;

  if (previous) {
    scrollMemory.set(previous, mountNode.scrollTop);
    rememberFocus(previous);
  }

  if (!routeCache.has(safeRoute)) {
    const res = await fetch(`pages/${safeRoute}.html`);
    if (!res.ok) throw new Error(`Page ${safeRoute} indisponible`);
    routeCache.set(safeRoute, await res.text());
  }

  if (!reducedMotion()) {
    mountNode.classList.add('route-leave');
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  mountNode.innerHTML = routeCache.get(safeRoute);
  mountNode.dataset.route = safeRoute;
  mountNode.classList.remove('route-leave');
  if (!reducedMotion()) mountNode.classList.add('route-enter');

  const rememberedScroll = scrollMemory.get(safeRoute) ?? 0;
  mountNode.scrollTop = rememberedScroll;

  requestAnimationFrame(() => {
    mountNode.classList.remove('route-enter');
    const rememberedFocus = focusMemory.get(safeRoute);
    const focusTarget = rememberedFocus ? mountNode.querySelector(rememberedFocus) : mountNode.querySelector('[data-autofocus],input,button,select,textarea');
    focusTarget?.focus?.({ preventScroll: true });
  });

  return safeRoute;
}
