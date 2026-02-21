const navBadges = new Map();

export const UI_FLAGS = {
  swipeToCloseModal: false,
  nativeQrScan: false,
};

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

let toastTimer;
export function showToast(message, tone = 'info', timeout = 2200) {
  let host = document.getElementById('uiToast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'uiToast';
    host.className = 'ui-toast';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }

  host.textContent = message;
  host.dataset.tone = tone;
  host.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove('is-visible'), timeout);
}

export function setLoading(node, loading = true) {
  if (!node) return;
  node.classList.toggle('is-loading', loading);
  node.setAttribute('aria-busy', loading ? 'true' : 'false');
}

export function bindAccordions(root = document) {
  root.querySelectorAll('[data-accordion-trigger]').forEach((trigger) => {
    const panelId = trigger.getAttribute('aria-controls');
    const panel = panelId ? root.getElementById(panelId) || document.getElementById(panelId) : null;
    if (!panel) return;

    if (!trigger.dataset.bound) {
      trigger.dataset.bound = '1';
      trigger.addEventListener('click', () => {
        const expanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        panel.hidden = expanded;
      });
    }
  });
}

export function openModal({ title = 'Information', content = '', actions = [] }) {
  let dialog = document.getElementById('uiModal');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'uiModal';
    dialog.className = 'ui-modal';
    document.body.appendChild(dialog);
  }

  const actionMarkup = actions
    .map((action, index) => `<button data-index="${index}" class="${action.variant || ''}">${action.label}</button>`)
    .join('');

  dialog.innerHTML = `
    <article class="ui-modal-card" role="document" aria-label="${title}">
      <header class="ui-modal-header"><h3>${title}</h3></header>
      <section class="ui-modal-body">${content}</section>
      <footer class="ui-modal-footer">${actionMarkup || '<button data-close>Fermer</button>'}</footer>
    </article>
  `;

  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('button[data-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = actions[Number(btn.dataset.index)];
      action?.onClick?.();
      if (!action?.keepOpen) dialog.close();
    });
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
  }, { once: true });

  document.body.classList.add('modal-open');
  dialog.showModal();
  return dialog;
}

export function closeModal() {
  document.getElementById('uiModal')?.close();
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});
