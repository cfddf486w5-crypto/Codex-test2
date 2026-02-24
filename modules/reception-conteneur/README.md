# Module Réception conteneur

Module offline-first DL WMS.

## Stockage
- Draft: `DLWMS_CONTAINER_DRAFT_V1`
- Historique: `DLWMS_CONTAINER_HISTORY_V1`
- BinMap: `DLWMS_BINMAP`
- IndexedDB: `DLWMS_RECEIPTS_DB_V1` (store `photos`)

## API globale
- `window.DLWMS_openReceptionConteneur()` ouvre la vue Réception conteneur et active l'onglet.

## Routing
- Hash support: `#/reception-conteneur`.
