# STYLE GUIDE — DL WMS

## Tokens
- Couleurs: `--ds-bg`, `--ds-panel`, `--ds-card`, `--ds-accent`, `--ds-warning`, `--ds-danger`, `--ds-success`.
- Typo: `--ds-font-12/14/16/18/22/28` + poids `--ds-weight-*`.
- Espacements: 4/8/12/16/20/24 via `--ds-space-*`.
- Radius: 12/16/20 via `--ds-radius-*`.
- Ombres: `--ds-shadow-soft`, `--ds-shadow-medium`.
- Safe area iPhone: `--safe-top/right/bottom/left`.

## Composants
- AppShell stable: topbar fixe, zone contenu, bottom-nav fixe.
- Bottom-nav: 5 onglets max (Accueil, Opérations, IA, Outils, Paramètres), icône 24px + label.
- Cartes/sections: bloc `.card` premium.
- Boutons: `primary`, `ghost`, `warn`.
- Form controls: input/select/textarea harmonisés.
- KPI tiles: `.kpi-tile`.
- Empty states: `.empty-state` avec SVG inline + CTA.

## Navigation
- Historique accessible uniquement depuis Home.
- Paramètres centralisés uniquement dans `Paramètres`.
- Les modules secondaires sont accessibles via hubs (`Opérations`, `Outils`).
