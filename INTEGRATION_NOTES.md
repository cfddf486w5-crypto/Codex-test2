# INTEGRATION NOTES

## Routes vues
- `#/modules` → hub modules (page `modules`).
- `#/history` → historique global (page `history`).
- `#/settings` (alias interne `parametres`) → paramètres globaux.
- `#/module/reception-conteneur` → page opérationnelle Réception conteneur.
- Modules stubs reliés: `consolidation`, `inventaire`, `monitoring` (suivi expédition), `remise`, `layout`.

## Modules branchés
- Réception conteneur: page opérationnelle complète + bouton FAQ + redirection paramètres section Réception.
- Consolidation, Inventaire, Suivi expédition, Remise en stock, Layout: accessibles depuis le hub Modules.

## Fonctions globales ajoutées
- `window.DLWMS_navTo(route)`
- `window.DLWMS_openModule(moduleId)`
- `window.DLWMS_openReceptionConteneur()`
