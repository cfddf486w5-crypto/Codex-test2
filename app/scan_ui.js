import ui from './ui.js';

const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

function normalizeScan(raw = '') {
  return raw.replace(INVISIBLE_CHARS, '').trim().toUpperCase();
}

export function attachScanController(input, options = {}) {
  if (!input || input.dataset.scanBound) return;
  input.dataset.scanBound = '1';
  input.setAttribute('autocapitalize', 'characters');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('inputmode', options.inputMode || 'text');

  let bufferStart = 0;
  let lastKeyTs = 0;

  const emit = (reason) => {
    const normalized = normalizeScan(input.value);
    if (!normalized) return;
    options.onScan?.({ value: normalized, reason, rapid: (Date.now() - bufferStart) < (options.fastThresholdMs || 120) });
    input.value = '';
    ui.toast('success', `Scan: ${normalized}`);
    ui.haptics('success');
    if (options.keepFocus !== false) ui.focus.scan();
  };

  input.addEventListener('keydown', (event) => {
    if (!bufferStart) bufferStart = Date.now();
    const now = Date.now();
    const delta = now - lastKeyTs;
    lastKeyTs = now;
    if (delta > 400) bufferStart = now;

    if (event.key === 'Enter') {
      event.preventDefault();
      emit('enter');
      bufferStart = 0;
    }
  });

  input.addEventListener('paste', () => {
    requestAnimationFrame(() => {
      emit('paste');
      bufferStart = 0;
    });
  });

  input.addEventListener('blur', () => {
    if (options.keepFocus === false) return;
    setTimeout(() => ui.focus.scan(), 80);
  });

  if (options.autoFocus !== false) {
    setTimeout(() => ui.focus.scan(), 10);
  }
}

export { normalizeScan };
