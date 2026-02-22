# Codex-test2 · DL WMS IA Offline First

## Démarrage rapide
1. Ouvrir `index.html` dans un navigateur moderne (Chrome/Safari/Edge).
2. Cliquer sur le bouton `🤖 IA` (bas à droite).
3. Utiliser les actions rapides ou poser une question libre.

## Architecture IA ajoutée
- `ai/ai_ui.js` : panneau chat, quick actions, feedback, formulaires connaissances.
- `ai/ai_engine.js` : orchestration intent → exemples validés → règles/FAQ/SOP → RAG docs.
- `ai/ai_rag.js` : chunking + index local TF-IDF simplifié.
- `ai/ai_tools.js` : outils WMS (agrégation inventaire/réception, `<20`, export CSV/PDF).
- `ai/ai_knowledge.js` : CRUD règles, SOP, FAQ, exemples validés, feedback.
- `ai/ai_store.js` : stockage IndexedDB avec fallback localStorage.
- `ai/ai_import.js` : import txt/md/csv/xlsx (xlsx via `window.XLSX` si dispo), CSV UTF-8 + ISO-8859-1.
- `ai/ai_export.js` : export JSON knowledge, CSV règles/FAQ, dataset feedback.
- `ai/ai_privacy.js` : mode Offline/Hybride + masquage simple des données sensibles.
- `ai/ai_prompts.js` : template de réponse structurée.
- `debug_ai.html` : page de test rapide.

## Confidentialité
- Mode par défaut: **Offline** (aucun envoi réseau).
- Toutes les données IA sont stockées localement (IndexedDB prioritaire).
- Mode Hybride préparé côté `server/` mais inactif par défaut.
- **Ne jamais exposer de clé API côté front**.

## “Apprendre” sans entraînement modèle
### 1) Ajouter des connaissances métier
Dans le panneau IA > section **Connaissances**:
- Ajouter une règle (titre, description, exemple, tags, priorité, sites, date)
- Ajouter une SOP (procédure en étapes)
- Ajouter une FAQ (Q/R)
- Importer des documents (txt/md/csv, xlsx optionnel)

### 2) Corriger les réponses
Sous chaque réponse IA:
- `👍 utile` enregistre le feedback positif.
- `👎 faux` ouvre une correction (`Correction`, `Pourquoi`, option “Marquer comme règle”).
- La correction est stockée comme **exemple validé** et priorisée aux questions similaires futures.

### 3) Réutilisation automatique
À chaque nouvelle question:
1. Recherche dans les exemples validés
2. Puis règles/FAQ/SOP
3. Puis chunks de documents importés (RAG local)
4. Génération d’une réponse structurée (résumé + détails + actions)

## Outils WMS disponibles
- Import CSV inventaire + réception
- Regroupement par item
- Totalisation qty + conservation bins/qty par bin
- Exclusion des lignes total = 0
- Liste des items `<20`
- Export CSV + PDF (simple) des déplacements

## Export/Import connaissances
- Export JSON complet (KB)
- Export CSV règles/FAQ
- Export dataset feedback (question/réponse validée)

## Exemples fournis
- `samples/regles-exemple.json`
- `samples/inventaire_test.csv`
- `samples/reception_test.csv`

## Mode hybride (optionnel)
- `server/server.js` + `.env.example`
- Endpoint stub: `POST /api/hybrid-chat`
- Activer seulement si backend local configuré.

## Livrable ZIP (hors Git)
Pour éviter les blocages PR liés aux binaires, le ZIP n'est plus versionné.
Générez-le localement au besoin:

```bash
zip -r dlwms_ai_offline.zip . -x '.git/*' -x 'node_modules/*'
```
