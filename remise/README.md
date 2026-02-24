# DL.WMS — Remise en stock (Laval) V1

Application **single-page**, **offline-first**, **iPhone-first**, sans backend ni dépendances externes.

## Contenu
- `index.html` — shell app + modales + panneau IA offline
- `styles.css` — UI mobile bleue, sombre/clair auto, cartes + popups
- `app.js` — router hash, store IndexedDB/LocalStorage, workflows, IA locale
- `data.schema.json` — schéma des objets persistés
- `assets/icons/remise.svg` — icône “Remise en stock”

## Lancer
1. Ouvrir directement `remise/index.html` dans un navigateur récent.
2. L’app fonctionne hors-ligne via IndexedDB (fallback LocalStorage).
3. Pour export/import, les téléchargements utilisent `Blob` côté navigateur.

## Flux couverts V1
- Génération remise: scan item (1 scan = 1 pièce), actions Briser/Rebox/Supprimer.
- Scrap: scan item + scan Scrapbox obligatoire, log complet.
- Compléter remise: scan panier `LAVREMPxx`, création remise `LAVREMxxxx`, tri Zone→Allée→Bin.
- Prochaine remise: scan/sélection ID remise.
- Traitement: scan item, confirmation bin, undo, forcer (justification obligatoire + log FORCED), entrée manuelle cachée ✍️.
- Historique: remises complétées, export JSON + CSV.
- Paramètres: users, zones, scanner, import mapping CSV (SKU/shortDesc/zone/aisle/bin), éditeur KB, debug.
- IA offline: FAQ fixe + notes KB + règles internes avec sources + bouton Pourquoi?.

## Import Excel (V1)
Excel natif `.xlsx` n’est pas parsé (pas de lib externe). Exporter depuis Excel en **CSV UTF-8** puis importer dans Paramètres.
Format attendu:
```csv
sku,shortDesc,zone,aisle,bin
ABC123,Produit A,A,A1,B01
```

## Intégration DL.WMS (tuile + routing)
Snippet HTML (page d’accueil):
```html
<a class="tile" href="/remise/index.html?embedded=1#home" aria-label="Remise en stock">
  <img src="/remise/assets/icons/remise.svg" alt="" width="40" height="40" />
  <span>Remise en stock</span>
</a>
```

Snippet routeur JS (si routeur interne DL.WMS):
```js
if (route === '/remise') {
  window.location.href = '/remise/index.html?embedded=1#home';
}
```

Mode embedded:
- `?embedded=1` → header minimal + bouton retour.
- Sans paramètre → header complet standalone.
