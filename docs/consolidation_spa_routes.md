# Consolidation (SPA) — test local rapide

## Lancer en local
- `python3 -m http.server 8000`
- Ouvrir `http://localhost:8000/#/consolidation`

## Routes consolidation
- `#/consolidation` : écran principal (hero + tuiles + assistant IA offline)
- `#/consolidation/charger` : scan SKU et création de session locale
- `#/consolidation/optimiser` : génération/applique de moves V1
- `#/consolidation/historique` : sessions/moves + effacement
- `#/consolidation/statistiques` : KPI + top SKU + charts canvas

## Stockage local
- `dlwms_conso_sessions`
- `dlwms_conso_moves`
- `dlwms_conso_settings`
- `dlwms_conso_ai_notes`
- `dlwms_conso_ai_chat`
