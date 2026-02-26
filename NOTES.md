# NOTES — Refactor layout system (pages secondaires uniquement)

## 1) Audit UI rapide (hors page principale)

### Routes détectées
- **Routes protégées (inchangées)** : `modules`, `home`, `dashboard`.
- **Routes secondaires harmonisées** :
  - `ai-center`, `history`, `inventaire`, `layout`, `monitoring`, `operations`, `parametres`, `prompt`, `reception`, `reception-conteneur`, `reception-faq`, `reception-preuve`, `remise`, `tools`, `ui-frame`, `ui-self-test`
  - `consolidation`, `consolidation/charger`, `consolidation/historique`, `consolidation/optimiser`, `consolidation/statistiques`
  - `remise/generer`, `remise/suivant`, `remise/verifier`, `remise/bins`

### Incohérences observées avant harmonisation
- Absence d’un gabarit commun entre pages secondaires (header/titre/statut variables selon route).
- Espacements verticaux hétérogènes entre sections/cartes.
- Débordements possibles sur mobile dans certains contenus longs.
- Position des actions (retour/recherche/navigation secondaire) non uniforme.
- Modales/dialogs hétérogènes selon les modules (dimensions/backdrop).

## 2) Layout system ajouté (scopé pages secondaires)

- Injection d’un wrapper `.page-secondary` côté runtime pour toutes les routes secondaires.
- Top bar secondaire cohérente :
  - bouton retour discret,
  - titre de page,
  - sous-titre contextuel,
  - statut online/offline.
- Zone de contenu secondaire scrollable avec padding constant iPhone-first.
- Système de spacing local 8px (`--space-1..--space-6`) + tokens radius/shadow/border.
- Cartes secondaires harmonisées via `.layout-card-standard`.
- Toolbar de recherche compacte injectée automatiquement pour les longues listes.
- Bouton discret “scroll to top” pour les pages longues.
- Harmonisation visuelle des `dialog`/backdrop (taille mobile + comportement stable).

## 3) Comment ça marche

- Le shell secondaire est appliqué dans la navigation (`app/core.js`) **après** chargement de route.
- Les routes `modules`, `home`, `dashboard` sont explicitement exclues.
- Le CSS est strictement scopé sous `.page-secondary` pour garantir zéro impact global.

## 4) Smoke test manuel (non-régression)

- [ ] Ouvrir page principale -> comparer visuel: OK
- [ ] Ouvrir pages secondaires -> vérifier header/retour/padding: OK
- [ ] iPhone (390x844) -> pas de scroll horizontal: OK
- [ ] Modales -> pas de scroll bug: OK
- [ ] Bottom nav -> inchangé sur page principale: OK
