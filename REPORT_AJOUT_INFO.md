# REPORT_AJOUT_INFO.md

## Déjà présent
- Navigation offline-first avec routes `modules/history/parametres`.
- Page Historique globale (`pages/history.html`) déjà branchée au stockage applicatif.
- Page Paramètres globale (`pages/parametres.html`) déjà présente.
- Assistant IA global avec mémoire locale (`DLWMS_GLOBAL_AI_MEMORY_V1`).

## Ajouté
- KB locale complète : `assets/data/kb_wms.json`.
- Backup interne :
  - `backup_kb/kb_wms_backup.json`
  - `backup_kb/changelog_kb.md`
- Nouveau module d’accès KB : `app/wms_kb.js`.
- Enrichissement IA locale par recherche KB + réponse explicative "Pourquoi ?".
- Enrichissement Historique avec les décisions de référence de la KB.
- Enrichissement Paramètres avec texte documentaire issu de la KB (sans changement de layout/composants).
- API interne d’accès KB exposée sur `window` pour usages futurs sans UI additionnel.

## Où c’est branché dans le code
- `app/wms_kb.js`
  - Chargement/fallback/caching localStorage
  - Recherche textuelle dans la KB
  - Génération d’explication "Pourquoi ?"
- `app/core.js`
  - Import du module KB
  - Préchargement KB au bootstrap
  - `bindGlobalAiAssistant()` : réponses IA enrichies depuis KB
  - `bindHistoryPage()` : ajout des entrées d’historique de la KB
  - `hydrateWmsKnowledge()` : exposition API KB + enrichissement non-intrusif de `parametres`

## Clés localStorage ajoutées (si applicable)
- `DLWMS_KB_WMS_V1` : cache local de la KB métier WMS.

## Version KB
- `kb_version`: `1.0.0`
- `last_updated`: `2026-02-25`
