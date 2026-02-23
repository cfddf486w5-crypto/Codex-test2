# DL WMS Offline AI

Application HTML/CSS/JS offline-first avec assistant IA local pour usage WMS (iPhone + PC).

## Installation
1. Ouvrir `index.html` depuis un serveur statique local (ex: `npx serve .`) ou via votre hébergement interne.
2. Aucune API externe n'est requise. Toutes les données restent locales (IndexedDB, fallback localStorage).

## Usage IA
- Bouton **Assistant IA**: ouvre le chat coulissant mobile-friendly.
- Quick actions:
  - Items < 20
  - Rapport déplacements
  - Import connaissances
  - Ajouter règle
  - Export knowledge + dataset
- Réponses: résumé + tableau structuré + citations internes + actions export/copie.
- Feedback:
  - 👍 utile: enregistre le feedback positif
  - 👎 faux: correction + raison + tags/site + option conversion en règle

## Architecture IA
- `ai_store.js`: schéma IndexedDB/localStorage.
- `ai_knowledge.js`: CRUD règles/FAQ/SOP/exemples.
- `ai_rag.js`: chunking, index local, recherche, citations.
- `ai_tools.js`: import/fusion inventaire+réception, seuil, rapport, exports.
- `ai_intents.js`: parser local intent + args (sans ML).
- `ai_engine.js`: orchestrateur (exemples validés -> règles -> RAG -> réponse).
- `ai_debug.js` + `debug_ai.html`: observabilité + trace.
- `ai_eval.js` + `tests/`: scoring qualité local.

## Confidentialité
- 100% offline par défaut.
- Aucune requête réseau émise par l'IA.
- Logs uniquement locaux (`debug_logs`).

## Import/Export Knowledge
- Export JSON complet: règles, FAQ, SOP, docs, metadata index, exemples validés, feedback.
- Export CSV règles/FAQ.
- Export dataset exemples validés en JSONL.
- Import connaissances/docs: via UI assistant (fichiers txt/csv, décodage UTF-8 + fallback ISO-8859-1).

## Évaluation
- Lancer: `node tests/run_tests.mjs`
- Dashboard: `debug_ai.html` affiche score, erreurs, tests, prompts et logs de décision.

## ZIP final
Pour générer l'archive livrable:
```bash
zip -r dl-wms-offline-ai.zip index.html assets ai debug_ai.html tests samples README.md
```

## Consolidation (spéc finale offline)
- Page **Consolidation** implémentée avec action bar complète: imports inventaire/réception/bin map, recalcul, export CSV moves, impression, export/import annexes JSON.
- Accordéons fermés par défaut: Règles, Tâches, Déplacements recommandés, Bins libres/vides, À valider.
- IA locale intégrée dans la page (bouton **Pourquoi ?** + chat repliable), basée sur FAQ embarquée + notes KB en localStorage.
- Annexes sauvegardées en localStorage: `settings`, `bin_map`, `diameter_overrides`, `users`, `active_user`, `tasks`, `move_logs`, `kb_notes`, `ai_chat_history`.
- Import Bin Map `.xlsx`: alternative offline documentée (exporter la feuille en CSV A=bin, B=type P1..P7 puis importer).
- Fichiers d'exemple de validation rapide: `samples/inventaire_test.csv`, `samples/reception_test.csv`, `samples/binmap_test.csv`.
