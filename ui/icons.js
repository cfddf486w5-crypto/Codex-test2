export const ICONS = {
  modules: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  history: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v5l3 2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  parametres: '<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4-.9.3a7.6 7.6 0 0 1-.5 1.3l.4.9-1.5 2.6-1-.1a7.6 7.6 0 0 1-1.1.8l-.3.9H9l-.3-.9a7.6 7.6 0 0 1-1.1-.8l-1 .1-1.5-2.6.4-.9a7.6 7.6 0 0 1-.5-1.3L4 12l.9-.3c.1-.5.3-.9.5-1.3l-.4-.9L6.5 6.9l1 .1c.3-.3.7-.5 1.1-.8L9 5.3h6l.3.9c.4.2.8.5 1.1.8l1-.1L19 9.5l-.4.9c.2.4.4.8.5 1.3Z" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export function icon(name) {
  return ICONS[name] || '';
}
