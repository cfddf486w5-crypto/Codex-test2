const RULEBOOK_STORAGE_KEY = 'rulebook_active';
const RULEBOOK_SELF_CHECK_KEY = 'dlwms_rulebook_selfcheck';

export const RULEBOOK_CANONICAL = String.raw`D1) Imports / Agrégation / Totaux
- Import Inventaire et Import Réception:
  - agréger les quantités par couple (SKU + BIN) en additionnant (éviter doublons).
  - totaux utilisés = valeurs agrégées.
- Exclure les lignes qty=0 de la notion de stock présent (qty=0 ne rend pas un bin “occupé”), mais les conserver en diagnostics/historique si déjà prévu.
- Si dans le CSV Réception le champ BIN est vide:
  - considérer une bin virtuelle RECEPTION_STAGING
  - elle compte dans total_after
  - elle peut être source de move
  - la vider compte comme bin libéré valide.

D2) Total_after & Segmentation des rapports
- total_after = qty_inventory + qty_receipt (incluant RECEPTION_STAGING).
- Rapports:
  - Rapport 1: “Toilette_Cafeteria” = total_after 1 à 6
  - Rapport 2: “Verifier_Transfert” = total_after 7 à 20
- Les cas “À valider” ne doivent PAS apparaître dans Rapport 1/2.

D3) Extraction diamètre & unités/palette
- Extraction diamètre depuis inventaire.description (mode hybride):
  1) patterns mags type “19x7.0”
  2) patterns spécifiques: “R17”, “17\"”, “17 PO”, “17IN”
  3) fallback: chercher un nombre entre 14 et 26 n’importe où
- Si plusieurs diamètres détectés (ex 17/18) => choisir le plus grand.
- Si introuvable => “DIAMÈTRE INCONNU”
  - mettre SKU en “À valider”
  - créer tâche obligatoire “Identifier diamètre”
  - permettre override manuel diamètre au niveau SKU (ITEM -> diamètre) persisté localStorage.

D4) Bin Map / Types / Inconnu
- Bin Map import depuis Excel .xlsx:
  - Col A = bin, Col B = type (en-tête)
  - types EXACTS: P1..P7 (majuscule)
- Si une bin n’existe pas dans Bin Map => TYPE INCONNU
  - mettre SKU en “À valider”
  - ne pas générer de move.

D5) RequiredType & Fallback type
- Calcul requiredType basé sur total_after:
  - convertir en “palettes_est” via diamètre -> unités/palette
  - mapping vers P1..P7 selon seuils de types
  - utiliser un arrondi vers le haut (ceil) pour être conservateur (1.1 => 2 palettes)
- Option “Fallback type” paramétrable dans Paramètres:
  - défaut = strict (type requis seulement)
  - si activé: autoriser type >= requiredType (jamais plus petit)
  - si plusieurs types possibles => choisir le plus petit type possible satisfaisant contraintes
  - tagger “Fallback type” seulement si type > requis

D6) Règles fondamentales de moves
- Un bin ne peut contenir qu’un seul SKU (pas de multi-SKU).
- Un SKU peut être réparti sur plusieurs bins cibles via split (max paramétrable, défaut=3).
- Ne proposer un move que s’il libère complètement au moins un bin source (bin vide après déplacement).
  - Les moves qui ne libèrent aucun bin ne sont pas recommandés et sont exclus de l’UI/rapports.
  - RECEPTION_STAGING compte comme bin libérable.

- Quand on déplace un SKU:
  - déplacer toute la quantité vers la cible (si capacité/type OK) plutôt que le minimum, afin de libérer une source.

D7) Sélection de la cible — Priorités
- Priorité globale de sélection:
  - B: bin existant contenant déjà le SKU, MAIS uniquement si le type est requis/compatible (ou >= requis si fallback ON)
  - E: bin libre du type requis (ou >= requis si fallback ON)
  - C: split sur 2-3 bins cibles (respect type/capacité/1 SKU par bin)
  - D: tri final (criticité/travel/critères restants)

- Mise à jour de la priorité B vs E:
  - Un bin existant contenant déjà le SKU n’est utilisé que s’il respecte le type requis (ou fallback ON).
  - Sinon, on cherche un bin libre du type requis.

- Si split:
  - remplir en priorité le bin existant contenant déjà le SKU (si valide), puis le reste dans les autres bins cibles.

- Si aucune cible possible (même en split) selon type/capacité:
  - aucun move n’est généré
  - mettre SKU en “À valider”
  - créer tâche obligatoire “identifier/créer une bin du type requis”

D8) Priorisation des moves (quand plusieurs options libèrent des bins)
- Prioriser selon l’ordre combiné:
  1) criticité (P7..P1) — plus critique d’abord
  2) nombre de bins libérés (desc)
  3) quantité à déplacer (moins)
  4) minimisation du travel (tri zone→rangée→bin→hauteur→position, sinon alphanum)

D9) Zones travel
- L’utilisateur choisit un ordre personnalisé dans Paramètres.
- Priorité personnalisée = L3 puis L2 puis L5; le reste alphanum.
- Supporter zones additionnelles textuelles: L3toilette, L5cafétéria, L5toilette, L2reception, L2tempon
  - traiter comme zone principale + sousZone pour tri/affichage.

D10) Exports CSV moves
- Format colonnes (ordre):
  - item, to_bin, move_qty, report, from_bin1, qty1, from_bin2, qty2, from_bin3, qty3, pallets_est (optionnelle)
- report contient le nom complet FR:
  - Toilette_Cafeteria / Verifier_Transfert
- Sources:
  - max 3 sources exportées
  - trier sources par criticité type (P7→P1) puis qty desc
  - si source = RECEPTION_STAGING => la placer en premier
- Split:
  - si split sur 2 bins cibles => export 2 lignes (même SKU, cible différente, qty différente)
  - si split sur 3 => export 3 lignes
- pallets_est:
  - optionnelle via Paramètres (par défaut incluse)
  - calcul = floor (arrondi vers le bas)

D11) Encodage / séparateur import-export
- Auto-détection du séparateur et encodage.
- Paramètres servent de préférence (fallback) en cas d’ambiguïté.
- Encodage paramétrable:
  - défaut UTF-8
  - fallback ISO-8859-1 (Latin-1) si erreur.

D12) Tâches & logs
- Statuts tâches style Indago-like:
  - Nouveau / En traitement / Complété
- Historique des moves en localStorage:
  - chaque move appliqué/confirmé loggé automatiquement
  - champs: date/heure, user optionnel, item, sources from→to, qty, report, tags
- Identification utilisateur:
  - sélecteur local (liste users) persisté localStorage
  - user actif appliqué aux logs et tâches

D13) IA locale (KB)
- Utiliser:
  - FAQ fixe intégrée (read-only)
  - Notes éditables (KB) stockées en localStorage
- Ces 2 sources alimentent:
  - le panneau chat IA offline
  - le bouton “Pourquoi ?” sur chaque move (explication)

D14) Annexes export/import (si déjà dans l’app)
- Inclure par défaut tout:
  - Bin Map, Paramètres, overrides diamètre, users, tâches, logs moves, KB IA, historique chat
- Stocker annexes en localStorage pour offline.`;

export const RULEBOOK_BACKUP = (`${RULEBOOK_CANONICAL}`);

function checksum(text) {
  let sum = 0;
  for (let i = 0; i < text.length; i += 1) {
    sum = (sum + text.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return `${text.length}:${sum}`;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function serializeRulebook(text) {
  const normalized = String(text || '');
  return JSON.stringify({ text: normalized, integrity: checksum(normalized) });
}

function isValidEntry(entry) {
  return Boolean(entry && typeof entry.text === 'string' && entry.integrity === checksum(entry.text));
}

export function restoreRulebookToBackup() {
  const payload = serializeRulebook(RULEBOOK_BACKUP);
  localStorage.setItem(RULEBOOK_STORAGE_KEY, payload);
  return RULEBOOK_BACKUP;
}

export function restoreRulebookToCanonical() {
  const payload = serializeRulebook(RULEBOOK_CANONICAL);
  localStorage.setItem(RULEBOOK_STORAGE_KEY, payload);
  return RULEBOOK_CANONICAL;
}

export function getActiveRulebook() {
  const existing = safeParse(localStorage.getItem(RULEBOOK_STORAGE_KEY) || '');
  if (isValidEntry(existing)) return existing.text;
  if (!localStorage.getItem(RULEBOOK_STORAGE_KEY)) return restoreRulebookToCanonical();
  return restoreRulebookToBackup();
}

function readKbNotes() {
  const parsed = safeParse(localStorage.getItem('kb_notes') || localStorage.getItem('DLWMS_RECEPTION_FAQ_NOTES_V1') || '');
  if (Array.isArray(parsed)) return parsed.map((item) => String(item?.text || item?.note || item || '').trim()).filter(Boolean);
  if (parsed && typeof parsed === 'object') return Object.values(parsed).map((v) => String(v || '').trim()).filter(Boolean);
  if (typeof parsed === 'string') return [parsed.trim()].filter(Boolean);
  return [];
}

export function explainMove(move = {}, context = {}) {
  const activeRulebook = getActiveRulebook();
  const kbNotes = readKbNotes();
  const item = move.item || move.sku || context.item || 'SKU inconnu';
  const target = move.to_bin || move.toBin || context.to_bin || 'bin inconnue';
  const report = move.report || context.report || 'À valider';
  const notesSnippet = kbNotes.length ? `Notes KB locales: ${kbNotes.slice(0, 2).join(' | ')}` : 'Notes KB locales: aucune.';
  return `Pourquoi ce move pour ${item} → ${target} (${report}) : priorité de libération de bin, respect du type requis et conformité au rulebook actif. ${notesSnippet}\n\nRulebook actif (extrait début): ${activeRulebook.slice(0, 220)}…`;
}

export function maybeRunRulebookSelfCheck() {
  if (localStorage.getItem(RULEBOOK_SELF_CHECK_KEY) !== '1') return;
  const active = getActiveRulebook();
  console.log('[DLWMS][rulebook:self-check]', {
    canonicalLength: RULEBOOK_CANONICAL.length,
    backupLength: RULEBOOK_BACKUP.length,
    activeLength: active.length,
    activeIntegrity: checksum(active),
  });
}
