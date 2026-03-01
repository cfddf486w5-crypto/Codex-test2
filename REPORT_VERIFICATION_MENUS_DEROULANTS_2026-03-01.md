# Rapport de vérification — menus déroulants

Date: 2026-03-01

## Objectif
Vérifier l'intégrité des menus déroulants (sélecteurs `<select>`) et des menus repliables (`<details>`) afin de confirmer qu'ils sont bien reliés et fonctionnels.

## Méthode
1. Démarrage d'un serveur local: `python3 -m http.server 8080`
2. Vérification assistée via Playwright (navigation réelle) sur les routes principales.
3. Contrôle des points suivants:
   - présence des menus déroulants,
   - nombre d'options,
   - état `disabled`,
   - liaison route -> page (`dataset.route`).

## Résultats (menus déroulants)

### Paramètres (`#/settings` → `parametres`)
- `settingsLayoutBrush`: 3 options, activé.
- `settingsFaqCategoryFilter`: 10 options, activé.

### Historique (`#/history`)
- `historyModuleFilter`: 4 options, activé.

### FAQ Réception (`#/reception-faq`)
- `receptionFaqSeverity`: 4 options, activé.

### Réception preuve (`#/reception-preuve`)
- `preuveFilterWindow`: 3 options, activé.

### Accueil (`#/home`)
- `homeBackupMode`: 2 options, activé.

### Layout (`#/layout`)
- `DROPDOWN_LAYOUT_SELECT`: 1 option disponible (normal si un seul layout local existe), activé.

### Prompt (`#/prompt`)
- `newPromptCategory`: 5 options, activé.
- `promptPreset`: 21 options, activé.

## Verdict
✅ Les menus déroulants testés sont présents, alimentés en options et activés.

Aucune rupture de liaison front-end n'a été observée sur les routes vérifiées.

## Note
Si le problème persiste sur iPhone uniquement, il est recommandé de tester:
- en HTTPS (pas en `file://`),
- sans ancien cache Safari (vider cache + forcer rechargement),
- avec la dernière version iOS/Safari.
