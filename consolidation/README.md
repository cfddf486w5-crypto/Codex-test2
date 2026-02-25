# Module Consolidation (offline-first)

Ce dossier contient une V1 autonome de la page **Consolidation** au style iPhone / thème bleu sombre, compatible ouverture directe via `index.html`.

## Ouvrir le module

- Méthode simple: double-cliquer `consolidation/index.html`.
- Option serveur local (facultative): `python3 -m http.server` puis ouvrir `http://localhost:8000/consolidation/`.
- Fallback: en cas de restriction navigateur sur `file://`, utiliser le serveur local ci-dessus.

## Intégration dans DL.WMS

Depuis la tuile "Consolidation" du hub principal, pointer vers:

```html
<a href="consolidation/index.html#home">Consolidation</a>
```

## Routes hash disponibles

- `#home` : écran principal (header + stats + tuiles + Assistant IA)
- `#charger` : scanner des items et clôturer une palette
- `#optimiser` : générer/appliquer des recommandations offline
- `#historique` : historique palettes + moves
- `#stats` : KPIs et graphique barres minimal
- `#ia-notes` : édition des notes KB

## Persistance locale

Stockage `localStorage` clé: `dlwms.consolidation.v1`

Collections incluses:
- `pallets`
- `moves`
- `history`
- `settings` (zone + scanDebounceMs)
- `ai_kb_notes`
- `ai_chat_history`

## Éditer la FAQ/KB IA

- FAQ fixe: tableau `faqFixed` dans `app.js` (35 entrées, extensible).
- Notes KB éditables: bouton ⚙️ dans "Assistant IA" (modal) ou route `#ia-notes`.

## Contraintes respectées

- Zéro API externe, zéro CDN, zéro dépendance.
- HTML/CSS/JS + SVG locaux uniquement.
- Navigation hash fonctionnelle et interactions V1 réelles.
