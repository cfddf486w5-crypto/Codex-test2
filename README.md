# DL WMS Offline AI

Application HTML/CSS/JS offline-first avec assistant IA local pour usage WMS (iPhone + PC).

## Installation
1. Ouvrir `index.html` depuis un serveur statique local ou via votre hébergement interne.
2. Aucune API externe n'est requise. Toutes les données restent locales (IndexedDB, fallback localStorage).

### Démarrage local (macOS/Linux/Windows)
- **Option 1 (Node.js, cross-platform)**: `npx serve .`
- **Option 2 (Python, cross-platform)**: `python -m http.server 8080`
- **Option 3 (VS Code)**: extension *Live Server* puis ouverture du dossier.

### Vérification Windows
- Installer Node.js LTS (inclut `node`/`npm`) puis vérifier:
  - `node -v`
  - `npm -v`
- Démarrer le serveur depuis **PowerShell** dans le dossier du projet:
  - `npx serve .`
- Ouvrir ensuite `http://localhost:3000` (ou le port affiché).
- Éviter l'ouverture directe en `file:///` pour garantir le bon fonctionnement des imports JS modules et du cache PWA.

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
- Compatible Windows/macOS/Linux (commande identique en terminal ou PowerShell).
- Dashboard: `debug_ai.html` affiche score, erreurs, tests, prompts et logs de décision.


## Intégration Azure Static Web Apps
- Workflow GitHub Actions: `.github/workflows/azure-static-web-apps-brave-hill-08ca54b1e.yml`.
- Le job **Validate Application** exécute `node tests/run_tests.mjs` avant tout déploiement.
- Le job **Build and Deploy Job** publie la racine du projet (`app_location: "/"`) pour déployer l'application complète.
- Secret requis côté GitHub: `AZURE_STATIC_WEB_APPS_API_TOKEN_BRAVE_HILL_08CA54B1E`.

## Liaison frontend Azure OpenAI (optionnelle)
- Ouvrir `Paramètres` > **IA Cloud · Azure OpenAI (frontend)**.
- Renseigner:
  - endpoint Azure,
  - deployment,
  - API version,
  - API key.
- Cliquer **Sauvegarder liaison** puis **Tester Azure OpenAI** pour vérifier la connectivité.
- ⚠️ Cette liaison en frontend est pratique pour test/démo mais expose la clé API au navigateur: privilégier un proxy backend pour la production.


## Variables d'environnement Azure AI Foundry (azd)
- Un exemple prêt à l'emploi est fourni dans `.env.azd.example`.
- Copier le fichier puis adapter si nécessaire:
  - `cp .env.azd.example .env`
- Variables incluses:
  - `AZURE_EXISTING_AGENT_ID`
  - `AZURE_ENV_NAME`
  - `AZURE_LOCATION`
  - `AZURE_SUBSCRIPTION_ID`
  - `AZURE_EXISTING_AIPROJECT_ENDPOINT`
  - `AZURE_EXISTING_AIPROJECT_RESOURCE_ID`
  - `AZURE_EXISTING_RESOURCE_ID`
  - `AZD_ALLOW_NON_EMPTY_FOLDER`

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

## MAP (navigation / routes / icônes / données)
| Page | Route | Bouton d’accès | Icône | Sources de données locales |
|---|---|---|---|---|
| Accueil IA | `ai-center` | Bottom-nav “Accueil” | 🏠 | IndexedDB `requests`, `stats`, `rules`, localStorage `selectedPromptPreset` |
| Consolidation | `consolidation` | Bottom-nav “Consol” | 📦 | IndexedDB datasets + règles locales |
| Monitoring | `monitoring` | Bottom-nav “Suivi” | 📊 | IndexedDB `requests`, `stats` |
| Paramètres globaux | `parametres` | Bottom-nav “Réglages” | ⚙️ | localStorage + IndexedDB (métriques) |
| Réception | `reception` | Bouton depuis Accueil | 📥 | Clés module réception (dont `DLWMS_BINMAP`) |
| Réception conteneur | `reception-conteneur` | Bouton dans page Réception | 🚚 | `DLWMS_CONTAINER_DRAFT_V1`, `DLWMS_CONTAINER_HISTORY_V1`, `DLWMS_BINMAP`, IndexedDB `DLWMS_RECEIPTS_DB_V1` |
| FAQ Réception | `reception-faq` | Boutons FAQ (Réception + conteneur) | ❓ | `DLWMS_RECEPTION_FAQ_V1`, `DLWMS_RECEPTION_FAQ_NOTES_V1`, `DLWMS_RECEPTION_FAQ_PREFS_V1` |
| Historique global | `history` | Bouton “Historique” depuis Accueil uniquement | 🕘 | IndexedDB `stats`, `requests` |

## FAQ Réception (offline-first)
- Fonction globale: `window.DLWMS_openReceptionFAQ()`.
- Export/Import JSON: fusion robuste avec restauration fallback si dataset manquant/corrompu.
- Notes équipe persistées localement, catégorie par catégorie.


## Pack 50 améliorations (Azure + offline-first, sans sécurisation)
- Détails du lot courant: `docs/CHANGELOG_PACK50.md`.
- Notes de migration stockage: `docs/STORAGE_MIGRATION_v4.md`.
- Configuration runtime via variables (injectables côté client):
  - `API_BASE_URL`
  - `APP_VERSION`
  - `BUILD_DATE`
  - `FEATURE_FLAGS` (JSON)
- UI Paramètres: section **Pack 50 · Runtime / Santé système** pour:
  - consulter version/build/backend/queue,
  - déclencher **Sync maintenant**,
  - exporter un diagnostic,
  - activer/désactiver les feature flags.
- Backend optionnel (Express): endpoints `/api/health`, `/api/time`, `/api/log`.

### Tests minimum (lot courant)
- `node tests/run_tests.mjs`
- `node tests/pack50_services.test.mjs`
