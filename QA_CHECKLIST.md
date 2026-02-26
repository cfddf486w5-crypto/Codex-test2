# QA CHECKLIST — DL WMS (Modules V1)

- [x] Nav routes: `#/modules`, `#/module/consolidation`, `#/module/remise`, `#/module/reception-preuve`, `#/history`, `#/settings`.
- [x] AppShell: topbar + badge "En ligne" + bottom-nav 3 boutons identiques sur les pages testées.
- [x] Hub Modules: cartes cliquables vers Consolidation, Remise en stock, Réception (Preuve).
- [x] Accordéons: sections fermées par défaut sur les 3 pages.
- [x] Consolidation: imports CSV/XLSX (si `window.XLSX`), KPI, exports, toasts sans crash sans data.
- [x] Remise: actions stub + création locale + export/import JSON + historique global filtré.
- [x] Réception Preuve: ajout photo (`accept=image/*`, `capture=environment`), stockage IndexedDB (`DLWMS_RECEIPTS_DB_V1/photos`), galerie/filtre/recherche/téléchargement/suppression/purge.
- [x] Console: aucun crash détecté lors des flows basiques exécutés.


## Ajout lot production-runtime (v3)
- [ ] Ouvrir `Paramètres` et vérifier que *Diagnostics* est OFF par défaut.
- [ ] Activer Diagnostics, vérifier affichage: version app, build, taille storage, dernier import, erreurs.
- [ ] Importer un fichier (CSV/JSON), puis vérifier `lastImport` mis à jour.
- [ ] Couper le réseau (DevTools offline), vérifier badge `Mode hors ligne · Sync pause`.
- [ ] Simuler une erreur JS et vérifier incrément du compteur d’erreurs badge.
- [ ] Exporter logs diagnostics JSON et vérifier contenu.
- [ ] Vérifier absence de régression navigation modules/history/paramètres.
