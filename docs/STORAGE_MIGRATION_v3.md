# Storage migration v3

## Versioning
- Clé de schéma: `DLWMS_STORAGE_SCHEMA_VERSION`
- Version cible: `3`

## Migrations
- v1 -> v2
  - Normalisation des entrées `localStorage` au format `{ version, value }` quand nécessaire.
- v2 -> v3
  - Initialisation des clés diagnostics runtime:
    - `DLWMS_DIAGNOSTICS_ENABLED_V1 = "0"`
    - `DLWMS_RUNTIME_LOG_BUFFER_V1 = []`

## Garanties
- Aucune suppression des données métier.
- Migration idempotente.
- Exécutée au bootstrap DB (`initDB`).
