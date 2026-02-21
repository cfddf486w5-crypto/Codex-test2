# UI Guide — WMS iPhone-first (UI1000)

## Foundation
- Point d’entrée UI: `app/ui.js` (`ui.*`) pour busy, toast, modal, accordion, banner, haptics, focus scan, listes chunkées/virtualisées.
- Contrat frame: `AppShell` = `header.topbar` + `main#app.app-shell` + `nav.bottom-nav`.
- Stamp de version UI: `data-ui-version="2026.02-ui1000"` sur `<html>` et `<body>`.

## Tokens et thème
- Tokens globaux dans `assets/style.css` + `assets/app.css` (spacing/radius/type/shadow).
- Dark par défaut (`data-theme="dark"`), light optionnel (`data-theme="light"`).
- Contraste renforcé via `data-contrast="high"`.
- Reduced motion/transparency supportés (`prefers-reduced-motion`, `prefers-reduced-transparency`).

## Contrats composants
- Card/Section: `.card`, `[data-ui-component="Section"]`.
- Boutons: `.btn/.primary/.warn/.ghost` + état busy `aria-busy=true`.
- Feedback: `ui.toast()`, `ui.banner.show()`, `ui.modal.open()` (focus trap + scroll lock).
- Accordéons: trigger `[data-accordion-trigger][aria-controls]` + panel `[data-state]`.
- Listes longues: `ui.list.chunked()` (rendu incrémental) ou `ui.list.virtual()` (seuil >500).

## Scan-first
- Ajouter `data-scan-input` sur l’input cible.
- `attachScanController()` normalise (`trim + uppercase + suppression invisibles`), gère Enter/paste, garde le focus.
- Taille de police input minimum 16px pour éviter zoom iOS.

## Route interne test
- Route cachée: `ui-self-test`.
- Ouvrir avec `Alt + U` pour valider scan, états UI et stress list 1000 lignes.
