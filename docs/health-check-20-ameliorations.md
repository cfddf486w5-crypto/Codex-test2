# Vérification fonctionnelle et plan d'amélioration (20 actions)

Date: 2026-02-25

## État global

✅ Le projet est **fonctionnel** sur les vérifications automatisées disponibles dans le dépôt.

## Vérifications exécutées

1. `node -v && npm -v`
   - Node.js: `v20.19.6`
   - npm: `11.4.2` (warning mineur de config env `http-proxy`, non bloquant)

2. `node tests/run_tests.mjs`
   - Résultat: `5/5` tests passés.

3. `node scripts/validate-rules.mjs`
   - Résultat: validation règles `OK`
   - Référentiel: `data/rules/main.rules.json`
   - Locations: `449`

4. `node scripts/audit-rules.mjs`
   - Résultat: audit généré dans `docs/rules-audit-report.md`

5. `node --check main.js && node --check app.js && node --check server/server.js`
   - Résultat: pas d'erreur de syntaxe détectée.

---

## 20 améliorations proposées + prompt prêt à l'emploi

> Format: **Amélioration** → **Prompt à me donner**

1. **Ajouter un pipeline CI (tests + validation règles) sur chaque commit**  
   Prompt: `Mets en place une CI GitHub Actions qui lance node tests/run_tests.mjs, node scripts/validate-rules.mjs et node scripts/audit-rules.mjs, puis échoue si un check échoue.`

2. **Ajouter un linter JS (ESLint) et formateur (Prettier)**  
   Prompt: `Ajoute ESLint + Prettier au projet, configure des scripts npm lint/format, corrige automatiquement les fichiers et propose une config simple adaptée à ce codebase vanilla JS.`

3. **Couverture de tests plus large (unitaires + intégration)**  
   Prompt: `Crée une base de tests supplémentaires pour les modules app/flow-engine.js, app/optimization-engine.js et ai/ai_engine.js avec des cas nominal, edge cases et erreurs.`

4. **Smoke tests UI automatisés (Playwright)**  
   Prompt: `Ajoute des smoke tests Playwright pour les pages clés (Accueil IA, Consolidation, Réception, Monitoring) avec vérification du rendu minimal et des interactions principales.`

5. **Vérification d'accessibilité (a11y)**  
   Prompt: `Audit l’accessibilité des pages HTML principales, corrige les labels/roles/tabindex manquants et ajoute une checklist a11y dans docs/.`

6. **Durcir la robustesse des imports CSV/JSON**  
   Prompt: `Améliore les imports CSV/JSON avec validation stricte des colonnes, messages d’erreur utilisateur clairs, et fallback sécurisé en cas de format invalide.`

7. **Versionner les schémas de données locales**  
   Prompt: `Implémente un système de migration versionnée pour IndexedDB/localStorage avec rollback simple et journal de migration.`

8. **Ajouter des garde-fous anti-corruption de données**  
   Prompt: `Ajoute des checks d’intégrité sur les données critiques au chargement, avec backup local automatique avant correction ou nettoyage.`

9. **Observabilité locale améliorée (logs structurés)**  
   Prompt: `Standardise les logs applicatifs en JSON (niveau, module, timestamp), ajoute un filtre UI et un export des logs de diagnostic.`

10. **Mesurer les performances front (temps de chargement / interactions)**  
    Prompt: `Ajoute un module de métriques offline (TTI, temps de rendu, taille données chargées) et affiche un mini tableau de bord performance.`

11. **Optimiser le bundle statique**  
    Prompt: `Réduis le coût de chargement initial en différant les scripts non critiques, en optimisant les images, et en documentant les gains.`

12. **Renforcer la sécurité côté client**  
    Prompt: `Ajoute une politique CSP compatible offline, sécurise les injections HTML potentielles, et documente les points de sécurité dans un fichier SECURITY.md.`

13. **Mode dégradé explicite (graceful degradation)**  
    Prompt: `Implémente un mode dégradé visible utilisateur quand IndexedDB échoue, avec fallback localStorage et message d’état clair.`

14. **Améliorer l’UX mobile terrain (gants, faible luminosité, one-hand)**  
    Prompt: `Optimise les interactions mobile terrain: zones tactiles plus grandes, contraste renforcé, flux rapides en 1 main, et test visuel sur iPhone.`

15. **Ajouter une recherche full-text plus tolérante**  
    Prompt: `Améliore le moteur de recherche avec normalisation accents/casse, suggestions proches, et scoring plus pertinent pour FAQ/règles.`

16. **Rendre l’IA plus explicable**  
    Prompt: `Ajoute un panneau “Pourquoi cette réponse ?” détaillant intent détecté, règles appliquées, citations RAG, et niveau de confiance.`

17. **Qualité des prompts et intents (benchmark interne)**  
    Prompt: `Crée un benchmark local d’intents/prompts avec jeu de tests versionné, score par release, et comparaison avant/après modifications.`

18. **Internationalisation FR/EN structurée**  
    Prompt: `Externalise toutes les chaînes UI vers des fichiers i18n, implémente FR/EN, et ajoute un sélecteur de langue persistant.`

19. **Sauvegarde/restauration guidée pour exploitation**  
    Prompt: `Ajoute un assistant de sauvegarde/restauration complet (données + configuration + KB), avec validation, checksum et rapport de restauration.`

20. **Documentation d'exploitation “runbook”**  
    Prompt: `Rédige un runbook opérationnel (démarrage, diagnostic, récupération incident, checklist quotidienne) pour une équipe logistique non technique.`

---

## Priorité recommandée (ordre court terme)

1) CI + lint/format  
2) Tests UI + couverture tests modules clés  
3) Migrations données + intégrité + sauvegarde  
4) Accessibilité + UX mobile terrain  
5) Observabilité + sécurité front
