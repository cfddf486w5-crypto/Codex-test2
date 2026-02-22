import { putEntity, getAllEntities } from './ai_store.js';

export function newRule(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id,
    title: input.title || 'Règle sans titre',
    site: input.site || 'GLOBAL',
    priority: Number(input.priority ?? 50),
    tags: input.tags || [],
    conditions: input.conditions || [],
    exceptions: input.exceptions || [],
    actions: input.actions || [],
    examples: input.examples || [],
    createdAt: input.createdAt || now,
    updatedAt: now,
    history: input.history || [],
  };
}

function includesAll(text, terms = []) {
  const t = String(text || '').toLowerCase();
  return terms.every((term) => t.includes(String(term).toLowerCase()));
}

export function evaluateRules({ question, site = 'GLOBAL', tags = [] }, rules = []) {
  const applicable = [];
  for (const rule of rules) {
    const siteOk = rule.site === 'GLOBAL' || rule.site === site;
    if (!siteOk) continue;
    const tagsOk = !rule.tags?.length || rule.tags.some((tag) => tags.includes(tag));
    const ifOk = !rule.conditions?.length || rule.conditions.some((cond) => includesAll(question, cond.all || []));
    const unless = rule.exceptions?.some((exc) => includesAll(question, exc.all || []));
    if (tagsOk && ifOk && !unless) applicable.push(rule);
  }
  applicable.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const conflicts = [];
  if (applicable.length > 1 && applicable[0].priority === applicable[1].priority) {
    conflicts.push({ type: 'priority_tie', ruleA: applicable[0].id, ruleB: applicable[1].id });
  }
  return { applicable, conflicts };
}

export async function saveRule(ruleInput) {
  const existing = (await getAllEntities('rules')).find((r) => r.id === ruleInput.id);
  const built = newRule(ruleInput);
  if (existing) {
    built.history = [...(existing.history || []), { snapshot: existing, ts: new Date().toISOString() }];
    built.createdAt = existing.createdAt;
  }
  return putEntity('rules', built);
}
