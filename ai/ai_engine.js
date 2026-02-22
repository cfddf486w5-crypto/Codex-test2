import { listKnowledge, addFeedback, addValidatedExample, addRule } from './ai_knowledge.js';
import { parseIntent } from './ai_intents.js';
import { evaluateRules } from './ai_rules.js';
import { searchChunks } from './ai_rag.js';
import { loadMergedDataset, itemsUnderThreshold, generateMovesReport, toCsv, exportHtmlPrint } from './ai_tools.js';
import { putEntity } from './ai_store.js';
import { logDecision } from './ai_debug.js';

function similarity(a, b) {
  const aa = new Set(String(a || '').toLowerCase().split(/\W+/).filter(Boolean));
  const bb = new Set(String(b || '').toLowerCase().split(/\W+/).filter(Boolean));
  const inter = [...aa].filter((x) => bb.has(x)).length;
  return inter / Math.max(1, Math.sqrt(aa.size * bb.size));
}

function citeRule(rule) { return `rule:${rule.id || 'n/a'}:${rule.title}`; }
function citeChunk(chunk) { return `${chunk.source}#${chunk.section}@${chunk.chunkId}`; }

export async function askAi(question, context = {}) {
  const { rules, examples } = await listKnowledge();
  const parsed = parseIntent(question);

  const bestExample = (examples || [])
    .map((x) => ({ ...x, score: similarity(question, x.question || '') }))
    .sort((a, b) => b.score - a.score)[0];

  if (bestExample && bestExample.score > 0.74) {
    const response = {
      summary: 'Réponse depuis exemple validé.',
      table: [{ answer: bestExample.correctAnswer || bestExample.answer }],
      citations: [`example:${bestExample.id}`],
      actions: ['copy'],
      source: 'validated_example',
    };
    await logDecision({ question, parsed, source: 'validated_example', citations: response.citations });
    return response;
  }

  const evalRules = evaluateRules({ question, site: context.site || 'GLOBAL', tags: context.tags || [] }, rules || []);

  if (parsed.intent === 'list_items_under_threshold' || parsed.intent === 'generate_moves_report' || parsed.intent === 'merge_totals') {
    const merged = await loadMergedDataset();
    const under = itemsUnderThreshold(merged, parsed.args.threshold || 20);
    const report = parsed.intent === 'generate_moves_report' ? generateMovesReport(merged) : under;
    const response = {
      summary: `${report.length} ligne(s) calculée(s) offline.`,
      table: report.slice(0, 50),
      raw: report,
      citations: evalRules.applicable.map(citeRule),
      actions: ['export_csv', 'export_pdf', 'copy'],
      source: 'tool',
      exports: {
        csv: toCsv(report),
        printHtml: exportHtmlPrint(report, 'Rapport déplacements'),
      },
    };
    await logDecision({ question, parsed, source: 'tool', tools: ['loadMergedDataset'], citations: response.citations, conflicts: evalRules.conflicts });
    return response;
  }

  if (parsed.intent === 'create_rule') {
    const created = await addRule({ title: `Règle auto: ${question.slice(0, 40)}`, conditions: [{ all: question.split(' ').slice(0, 3) }], actions: ['Clarifier process'], priority: 60 });
    return { summary: 'Règle créée.', table: [{ id: created.id, title: created.title }], citations: [citeRule(created)], actions: ['copy'], source: 'rule' };
  }

  const chunks = await searchChunks(question, 5);
  const response = {
    summary: `Intent ${parsed.intent}. ${chunks.length} source(s) locale(s) trouvée(s).`,
    table: chunks.map((c) => ({ source: c.source, section: c.section, extrait: c.text.slice(0, 140) })),
    citations: [...evalRules.applicable.map(citeRule), ...chunks.map(citeChunk)],
    actions: ['copy'],
    source: 'rag',
  };
  await logDecision({ question, parsed, source: 'rag', chunks: chunks.map((c) => c.chunkId), conflicts: evalRules.conflicts });
  return response;
}

export async function saveChatTurn(question, answer) { return putEntity('chat_history', { question, answer }); }

export async function saveFeedback({ question, aiAnswer, helpful, correction, why, markAsRule, tags = [], site = 'GLOBAL' }) {
  await addFeedback({ question, aiAnswer, helpful, correction, why, tags, site });
  if (!helpful && correction) {
    await addValidatedExample({ question, intent: 'manual_feedback', args: {}, correctAnswer: correction, tags, site });
    if (markAsRule) await addRule({ title: `Feedback: ${question.slice(0, 50)}`, site, tags, conditions: [{ all: question.split(' ').slice(0, 3) }], actions: [correction], priority: 80 });
  }
}
