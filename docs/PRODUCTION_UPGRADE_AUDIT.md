# DL WMS — Audit automatique Phase 0 (synthèse)

## Carte pages / modules / routes
- Shell SPA: `index.html` + `app/core.js` + `core/router.js`.
- Routes principales: `modules`, `history`, `parametres`.
- Modules opérationnels: `consolidation`, `inventaire`, `monitoring`, `remise`, `reception-conteneur`, `reception-preuve`, `reception-faq`, `ui-self-test`.
- Data flows clés:
  - Import fichiers -> parse -> split colonnes -> IndexedDB (`datasets`, `excelRows`, `excelColumns`).
  - Paramètres globaux -> `localStorage` enveloppé via `core/storage.js`.
  - IA offline -> moteur local (`app/ai-engine.js`, `app/rulebook.js`, `app/wms_kb.js`) sans appel API externe.

## Risques détectés
- LocalStorage historique hétérogène (valeurs anciennes parfois non enveloppées).
- Erreurs runtime non centralisées (avant patch, pas de buffer unique exportable).
- Diagnostic opérateur partiel (pas de vue compacte version/build/storage/last import/errors).
- Import industrialisé partiellement robuste mais traçabilité dernier import manquante.

## Actions implémentées dans ce lot
1. Runtime Core léger (`core/runtime.js`):
   - logger central info/warn/error avec buffer persistant,
   - handlers globaux `window.error` et `unhandledrejection`,
   - snapshot diagnostics unifié,
   - export logs JSON.
2. Diagnostics Mode (désactivé par défaut) dans `Paramètres`.
3. Storage migration versionnée (`DLWMS_STORAGE_SCHEMA_VERSION`, cible v3) sans perte.
4. Badge réseau enrichi (online/offline + état sync + compteur erreurs).

## Périmètre restant (phases suivantes)
- Import Wizard complet (détection encoding ISO-8859-1 + mapping guidé persistant).
- Écran Sauvegarde avancé (preview + rollback transactionnel complet).
- QA auto 10 scénarios “Self-test” métier (au-delà du self-test UI existant).
