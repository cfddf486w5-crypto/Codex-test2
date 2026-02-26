# Migration stockage v4 (notes)

## Objectif
Ajouter la couche runtime pack 50 sans casser les données existantes.

## Nouvelles clés
- `DLWMS_RUNTIME_CONFIG_V1`: configuration runtime/fonctionnalités.
- `DLWMS_OPLOG_V1`: queue offline des actions à synchroniser.
- `DLWMS_LAST_SYNC_AT`: horodatage de dernière tentative de sync.

## Compatibilité
- Les clés existantes (`DLWMS_*`, `dlwms_*`) ne sont pas supprimées.
- Aucun changement bloquant des schémas IndexedDB actuels.
- Si les nouvelles clés sont absentes, le runtime utilise des valeurs par défaut.

## Stratégie rollback
- Supprimer uniquement les 3 nouvelles clés ci-dessus.
- Les fonctionnalités historiques restent opérationnelles.
