import { getAllEntities, putEntity, removeEntity } from './ai_store.js';

const SITE_OPTIONS = ['Laval', 'Laval2', 'Langelier'];

export { SITE_OPTIONS };

export async function addRule(payload) {
  return putEntity('rules', { type: 'rule', priority: 'Moyenne', sites: [], ...payload });
}

export async function addSop(payload) {
  return putEntity('sops', { type: 'sop', steps: [], ...payload });
}

export async function addFaq(payload) {
  return putEntity('faqs', { type: 'faq', ...payload });
}

export async function addValidatedExample(payload) {
  return putEntity('examples', { type: 'validated_example', ...payload });
}

export async function addFeedback(payload) {
  return putEntity('feedback', { type: 'feedback', ...payload });
}

export async function listKnowledge() {
  const [rules, sops, faqs, examples] = await Promise.all([
    getAllEntities('rules'),
    getAllEntities('sops'),
    getAllEntities('faqs'),
    getAllEntities('examples'),
  ]);
  return { rules, sops, faqs, examples };
}

export async function deleteKnowledge(type, id) {
  const map = { rule: 'rules', sop: 'sops', faq: 'faqs', example: 'examples' };
  if (!map[type]) throw new Error('Type inconnu');
  return removeEntity(map[type], id);
}
