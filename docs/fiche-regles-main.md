# Fiche de règles — `main.js`

## Portée
Cette fiche formalise et externalise les règles métier détectées dans `main.js`, **sans modification UI**.

## Fichiers intégrés
- `data/rules/main.rules.json` : source de vérité des règles.
- `scripts/validate-rules.mjs` : validation structurelle et métier.
- `scripts/audit-rules.mjs` : génération d'un audit lisible.
- `tests/rules_validation.test.mjs` : test automatisé de validation.

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
- Ce mapping est conservé dans le JSON de règles pour éviter la dérive métier.

### 5) Règles de capacité palettes
- P1: min 1 / max 3
- P2: min 4 / max 6
- P3: min 7 / max 9
- P4: min 10 / max 12
- P5: min 13 / max 15
- P6: min 16 / max 18
- P7: min 19 / max 21

### 6) Offline iPhone (contrainte ajoutée)
- `platformConstraints.offline = true`
- `platformConstraints.target = iPhone`
- Validation et audit exécutables en local, sans dépendance réseau.

## Vérifications effectuées
- Vérification syntaxique JS: `node --check main.js` ✅
- Validation règles: `node scripts/validate-rules.mjs` ✅
- Test dédié: `node tests/rules_validation.test.mjs` ✅
- Audit généré: `node scripts/audit-rules.mjs` ✅

## Ce que l'on peut ajouter ensuite (toujours sans toucher l'UI)
- Brancher `main.js` sur `data/rules/main.rules.json` au runtime pour supprimer les constantes dupliquées.
- Ajouter un contrôle CI pour bloquer toute règle invalide.
- Ajouter des seuils métier spécifiques par zone (A/B/C/D) dans le même fichier de règles.
