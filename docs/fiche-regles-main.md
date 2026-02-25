# Fiche de règles — `main.js`

## Portée
Cette fiche formalise les règles métier détectées dans `main.js`, **sans modification UI**.

## Règles intégrées

### 1) Grille et état
- La grille est initialisée via `createEmptyGrid(ROWS, COLS)`.
- L'état central passe par `layoutState` (abonnement + synchronisation de `gridData`).

### 2) Persistance
- Clé de plan: `dl_shop_layout_v9`.
- Clé des zones: `dl_zonenames_v9`.

### 3) Contraintes BIN
- Taille maximale d'un BIN: `MAX_BIN_CELLS = 10`.
- Outil par défaut: `binrange`.

### 4) Référentiel types d'emplacement
- `LOCATION_TYPE_MAP` mappe `LOCATION -> TYPE` (ex: `P1..P7`, `MAGASIN`, `RACKING`, `Temporaire`).
- Ce mapping est utilisé comme règle de classification métier (sans impact visuel direct).

### 5) Règles de capacité palettes
- P1: min 1 / max 3
- P2: min 4 / max 6
- P3: min 7 / max 9
- P4: min 10 / max 12
- P5: min 13 / max 15
- P6: min 16 / max 18
- P7: min 19 / max 21

### 6) Modes de travail
- Mode édition et navigation sont exclusifs.
- Undo/Redo passent par le moteur d'opérations (`UNDO`, `REDO`, `SNAPSHOT`).

## Vérification effectuée
- Vérification syntaxique JS: `node --check main.js` ✅

## Ce que l'on peut ajouter ensuite (sans toucher l'UI)
- Extraire les règles (`LOCATION_TYPE_MAP`, `P_CAPACITY`, limites BIN) dans un fichier de configuration versionné (`data/rules/*.json`).
- Ajouter un validateur automatique des règles (schéma JSON + test Node).
- Ajouter des tests unitaires métier (capacités P1..P7, limites de BIN, cohérence de mapping).
- Ajouter un rapport d'audit des règles (incohérences, clés dupliquées, types non reconnus).

> Toute évolution ci-dessus peut être faite **sans modifier l'interface**, uniquement la couche règles/données.
