import { getAllEntities, putEntity, removeEntity } from './ai_store.js';
import { saveRule } from './ai_rules.js';

export const SITE_OPTIONS = ['GLOBAL', 'PARIS', 'LYON', 'MARSEILLE'];

export async function addRule(rule) { return saveRule(rule); }
export async function deleteRule(id) { return removeEntity('rules', id); }
export async function addFaq(faq) { return putEntity('faqs', faq); }
export async function addSop(sop) { return putEntity('sops', sop); }
export async function addValidatedExample(example) { return putEntity('examples', example); }
export async function addFeedback(feedback) { return putEntity('feedback', feedback); }

export async function listKnowledge() {
  const [rules, sops, faqs, examples] = await Promise.all([
    getAllEntities('rules'),
    getAllEntities('sops'),
    getAllEntities('faqs'),
    getAllEntities('examples'),
  ]);
  return { rules, sops, faqs, examples };
}
