# Changelog KB WMS

## Ajouté
- Base de connaissance complète `assets/data/kb_wms.json` avec sections : about/vision, piliers, phases, principes, règles, bins/types/zones, paramètres, tâches exemples et historique exemples.
- Backup interne intégral `backup_kb/kb_wms_backup.json`.
- Chargement KB offline-first via `app/wms_kb.js` (fetch local + fallback localStorage `DLWMS_KB_WMS_V1`).
- Raccordement IA locale (assistant global) : réponses enrichies depuis KB + explication "Pourquoi ?".
- Raccordement Historique : fusion des entrées KB (décisions métier) avec l’historique dynamique existant.
- Raccordement Paramètres : enrichissement non-intrusif du texte documentaire existant avec paramètres KB.
- Exposition API interne sans nouvel écran : `window.DLWMS_WMS_KB`, `window.DLWMS_getWmsKnowledge`, `window.DLWMS_searchWmsKnowledge`.

## Déjà présent
- Application offline-first avec service worker et stockage local.
- Page `history` existante avec filtre module et rendu des événements.
- Page `parametres` existante avec sections accordéon.
- Assistant IA global existant avec mémoire locale.
