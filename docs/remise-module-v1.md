# Module Remise en stock (V1)

## Routes
- `#/remise` : hub principal (hero + tuiles + assistant IA)
- `#/remise/generer` : génération d'une remise (scan, briser, rebox, compléter)
- `#/remise/suivant` : traitement des remises actives (scan produit/bin + forcer)
- `#/remise/verifier` : vérifier un SKU dans les remises
- `#/remise/bins` : vérifier une bin dans les remises actives

## Test local rapide
1. Lancer un serveur statique à la racine du repo (ex: `python -m http.server 4173`).
2. Ouvrir `http://localhost:4173/#/remise`.
3. Vérifier le flux:
   - créer une remise via `#/remise/generer`
   - traiter via `#/remise/suivant`
   - contrôler via `#/remise/verifier` et `#/remise/bins`

## Stockage local utilisé
- `dlwms_rem_data`
- `dlwms_rem_scrap_log`
- `dlwms_rem_rebox`
- `dlwms_rem_settings`
- `dlwms_rem_ai_notes`
- `dlwms_rem_ai_chat`
