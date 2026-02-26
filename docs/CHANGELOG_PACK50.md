# Changelog — Pack 50 améliorations (Azure / Offline-first)

## 2026-02-26

### Ajouts implémentés dans ce lot
- Configuration runtime multi-environnements via `window.__DLWMS_ENV__` + persistance locale (`API_BASE_URL`, `APP_VERSION`, `BUILD_DATE`, `FEATURE_FLAGS`).
- Feature flags modifiables depuis **Paramètres > Pack 50 · Runtime / Santé système**.
- Service de santé local avec fallback backend (`/api/health`) + source de temps (`/api/time`).
- Queue offline locale (oplog) avec statuts `pending/sent/error` + bouton **Sync maintenant**.
- Export diagnostic JSON + nettoyage sécurisé de queue depuis l'UI paramètres.
- Endpoints backend optionnels ajoutés dans `server/server.js`: `/api/health`, `/api/time`, `/api/log`.

### Mapping synthétique des 50 améliorations
- **A (1–10):** couvert partiellement/majoritairement par runtime config, endpoints optionnels, monitoring erreurs, santé système, feature flags, mode grâce queue offline, version notes.
- **B (11–20):** queue offline et sync manuelle renforcées; migration et auto-réparation partiellement couvertes par stockage existant + scripts précédents.
- **C (21–30):** déjà présent côté app (imports/exports) avec validations existantes; ce lot consolide diagnostics d'exécution.
- **D (31–40):** déjà présent en grande partie (Pourquoi, règles, IA locale, KB) dans les modules consolidation/IA.
- **E (41–50):** UX terrain déjà avancée dans les pages existantes; ce lot ajoute l'orchestration runtime dans Paramètres.

### Notes
- Aucune sécurisation ajoutée (pas d'auth, pas de rôles, pas de routes protégées).
- Fallback local maintenu si backend indisponible.
