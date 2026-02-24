export const ICONS = {
  home: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 10.8 12 4l9 6.8V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" stroke="currentColor"/></svg>',
  operations: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h12M4 17h8" stroke="currentColor"/></svg>',
  ai: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" stroke="currentColor"/></svg>',
  tools: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14h6v6H4zm10-10h6v6h-6zM13 13l7 7" stroke="currentColor"/></svg>',
  settings: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4-.9.3a7.6 7.6 0 0 1-.5 1.3l.4.9-1.5 2.6-1-.1a7.6 7.6 0 0 1-1.1.8l-.3.9H9l-.3-.9a7.6 7.6 0 0 1-1.1-.8l-1 .1-1.5-2.6.4-.9a7.6 7.6 0 0 1-.5-1.3L4 12l.9-.3c.1-.5.3-.9.5-1.3l-.4-.9L6.5 6.9l1 .1c.3-.3.7-.5 1.1-.8L9 5.3h6l.3.9c.4.2.8.5 1.1.8l1-.1L19 9.5l-.4.9c.2.4.4.8.5 1.3Z" stroke="currentColor"/></svg>',
};

export function icon(name) {
  return ICONS[name] || '';
}
