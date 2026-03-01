const navBadges = new Map();
const busyRegistry = new Map();
const accordions = new Map();
let toastTimer;
let activeModal;
let lastFocusedBeforeModal;
let lastScanNode;

export const UI_VERSION = '2026.02-ui1000';

export const UI_FLAGS = {
  swipeToCloseModal: false,
  nativeQrScan: false,
  autoFocusScan: true,
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ICONS = {
  home: '🏠',
  consolidation: '📦',
  monitoring: '📊',
  settings: '⚙️',
  faq: '❓',
  history: '🕘',
};

export function getIcon(name) {
  return ICONS[name] || '•';
}


function getFocusableElements(root) {
  return [...root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

function ensureToastHost() {
  let host = document.getElementById('uiToast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'uiToast';
    host.className = 'ui-toast';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'true');
    document.body.appendChild(host);
  }
  return host;
}

function ensureBannerHost() {
  let banner = document.getElementById('uiBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'uiBanner';
    banner.className = 'ui-banner';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    document.body.prepend(banner);
  }
  return banner;
}

export function debounce(fn, wait = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function rafThrottle(fn) {
  let frame = 0;
  return (...args) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      fn(...args);
    });
  };
}

export function addPassiveListener(node, type, handler) {
  node.addEventListener(type, handler, { passive: true });
}

export function setNavActive(route) {
  document.querySelectorAll('.bottom-nav [data-route]').forEach((button) => {
    const active = button.dataset.route === route;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

export function setNavBadge(route, value = '') {
  const button = document.querySelector(`.bottom-nav [data-route="${route}"]`);
  if (!button) return;
  let badge = navBadges.get(route);
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'nav-badge';
    button.appendChild(badge);
    navBadges.set(route, badge);
  }
  badge.textContent = value;
  badge.hidden = !value;
}

export function setBusy(id, busy = true) {
  const node = typeof id === 'string' ? document.getElementById(id) || document.querySelector(`[data-busy-id="${id}"]`) : id;
  if (!node) return;
  node.classList.toggle('is-busy', busy);
  node.setAttribute('aria-busy', busy ? 'true' : 'false');
  if (node.matches('button,[type="button"],[type="submit"]')) {
    node.disabled = busy;
  }
  if (busy) busyRegistry.set(node, Date.now());
  else busyRegistry.delete(node);
}

export function setLoading(node, loading = true) {
  setBusy(node, loading);
}

export function showToast(message, tone = 'info', timeout = 2200) {
  ui.toast(tone, message, { timeout });
}

export function bindAccordions(root = document) {
  root.querySelectorAll('[data-accordion-trigger]').forEach((trigger) => {
    if (trigger.dataset.bound) return;
    trigger.dataset.bound = '1';
    trigger.addEventListener('click', () => ui.accordion.toggle(trigger));
  });
}

function toggleAccordion(triggerOrId) {
  const trigger = typeof triggerOrId === 'string'
    ? document.querySelector(`[data-accordion-trigger][aria-controls="${triggerOrId}"]`)
    : triggerOrId;
  if (!trigger) return;
  const panelId = trigger.getAttribute('aria-controls');
  const panel = panelId ? document.getElementById(panelId) : null;
  if (!panel) return;
  const expanded = trigger.getAttribute('aria-expanded') === 'true';
  const next = !expanded;
  trigger.setAttribute('aria-expanded', String(next));
  panel.hidden = !next;
  panel.setAttribute('data-state', next ? 'open' : 'closed');
  accordions.set(panelId, next);
}

function closeActiveModal() {
  if (!activeModal) return;
  activeModal.close();
}

function trapFocus(event) {
  if (!activeModal || event.key !== 'Tab') return;
  const focusables = getFocusableElements(activeModal);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openModal({ id = 'uiModal', title = 'Information', content = '', actions = [] }) {
  return ui.modal.open(id, { title, content, actions });
}

export function closeModal() {
  ui.modal.close();
}

function haptics(type = 'light') {
  if (!('vibrate' in navigator)) return;
  const pattern = type === 'success' ? [15] : type === 'error' ? [20, 30, 20] : [10];
  navigator.vibrate(pattern);
}

function focusScan() {
  const node = document.querySelector('[data-scan-input]');
  if (!node) return;
  if (document.activeElement !== node) node.focus({ preventScroll: true });
  lastScanNode = node;
}

function renderListChunked({ items = [], renderItem, mount, chunkSize = 40, onDone }) {
  if (!mount || typeof renderItem !== 'function') return;
  mount.innerHTML = '';
  let index = 0;
  const frag = document.createDocumentFragment();

  const paint = () => {
    const end = Math.min(items.length, index + chunkSize);
    for (; index < end; index += 1) {
      frag.appendChild(renderItem(items[index], index));
    }
    mount.appendChild(frag);
    if (index < items.length) requestAnimationFrame(paint);
    else onDone?.();
  };

  requestAnimationFrame(paint);
}

function renderVirtualList({ items = [], mount, renderRow, rowHeight = 52, overscan = 6 }) {
  if (!mount || typeof renderRow !== 'function') return;
  const viewport = mount;
  viewport.innerHTML = '<div class="virtual-spacer" aria-hidden="true"></div><div class="virtual-window"></div>';
  const spacer = viewport.querySelector('.virtual-spacer');
  const windowNode = viewport.querySelector('.virtual-window');
  spacer.style.height = `${items.length * rowHeight}px`;

  const render = () => {
    const top = viewport.scrollTop;
    const viewHeight = viewport.clientHeight;
    const start = Math.max(0, Math.floor(top / rowHeight) - overscan);
    const count = Math.ceil(viewHeight / rowHeight) + overscan * 2;
    const end = Math.min(items.length, start + count);
    windowNode.style.transform = `translateY(${start * rowHeight}px)`;
    windowNode.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i += 1) {
      frag.appendChild(renderRow(items[i], i));
    }
    windowNode.appendChild(frag);
  };

  addPassiveListener(viewport, 'scroll', rafThrottle(render));
  render();
}

export const ui = {
  setBusy,
  toast(type = 'info', msg = '', opts = {}) {
    const host = ensureToastHost();
    host.textContent = msg;
    host.dataset.tone = type;
    host.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => host.classList.remove('is-visible'), opts.timeout ?? 2200);
    if (type === 'error') haptics('error');
  },
  banner: {
    show(type = 'info', msg = '') {
      const banner = ensureBannerHost();
      banner.hidden = false;
      banner.dataset.tone = type;
      banner.textContent = msg;
    },
    hide() {
      const banner = ensureBannerHost();
      banner.hidden = true;
    },
  },
  modal: {
    open(id = 'uiModal', opts = {}) {
      let dialog = document.getElementById(id);
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = id;
        dialog.className = 'ui-modal';
        document.body.appendChild(dialog);
      }
      const actions = opts.actions || [];
      dialog.innerHTML = `
        <article class="ui-modal-card" role="document" aria-label="${opts.title || 'Information'}">
          <header class="ui-modal-header"><h3>${opts.title || 'Information'}</h3></header>
          <section class="ui-modal-body">${opts.content || ''}</section>
          <footer class="ui-modal-footer">${actions.map((a, i) => `<button data-modal-action="${i}" class="${a.variant || ''}">${a.label}</button>`).join('') || '<button data-close>Fermer</button>'}</footer>
        </article>
      `;
      lastFocusedBeforeModal = document.activeElement;
      activeModal = dialog;
      document.body.classList.add('modal-open');
      dialog.addEventListener('keydown', trapFocus);
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeActiveModal();
      });
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeActiveModal();
      });
      dialog.querySelector('[data-close]')?.addEventListener('click', closeActiveModal);
      dialog.querySelectorAll('[data-modal-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = actions[Number(btn.dataset.modalAction)];
          action?.onClick?.();
          if (!action?.keepOpen) closeActiveModal();
        });
      });
      dialog.addEventListener('close', () => {
        document.body.classList.remove('modal-open');
        dialog.removeEventListener('keydown', trapFocus);
        activeModal = null;
        lastFocusedBeforeModal?.focus?.({ preventScroll: true });
      }, { once: true });
      dialog.showModal();
      getFocusableElements(dialog)[0]?.focus?.({ preventScroll: true });
      return dialog;
    },
    close: closeActiveModal,
  },
  accordion: { toggle: toggleAccordion },
  focus: {
    scan: focusScan,
    restoreLast() {
      if (lastScanNode?.isConnected) lastScanNode.focus({ preventScroll: true });
    },
  },
  haptics,
  list: {
    chunked: renderListChunked,
    virtual: renderVirtualList,
  },
};

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeActiveModal();
});

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-ui-action]');
  if (!action) return;
  action.classList.add('is-pressed');
  setTimeout(() => action.classList.remove('is-pressed'), prefersReducedMotion() ? 0 : 120);
});

export default ui;
