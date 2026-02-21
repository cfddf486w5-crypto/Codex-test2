# UI Testing Checklist — iPhone Safari / Offline

## 1) iPhone terrain
- [ ] Ouvrir l’app en PWA, passer online/offline: badge réseau cohérent, aucune dépendance réseau externe.
- [ ] Vérifier safe-area (haut + bas) sur iPhone notch et rotation portrait.
- [ ] Vérifier clavier: focus input sans jump brutal de layout, boutons toujours atteignables à une main.
- [ ] Tester scan input (`data-scan-input`): saisie rapide, Enter, paste, auto-clear, refocus.

## 2) Performance
- [ ] Route `ui-self-test` (`Alt+U`) puis “Lancer test perf”: scroll fluide sur 1000 items.
- [ ] Naviguer rapidement entre routes: pas de glitch visuel, pas de double navigation.
- [ ] Ouvrir/fermer modal plusieurs fois: pas de fuite focus, body lock propre.
- [ ] Import local de gros JSON/CSV: UI reste réactive (batch localStorage + IndexedDB).

## 3) Accessibilité
- [ ] Focus visible clavier sur actions principales.
- [ ] Toast et banner annoncés (`aria-live`).
- [ ] Accordéons: état `aria-expanded` cohérent.
- [ ] Modal: focus trap actif + fermeture Escape.
- [ ] Vérifier VoiceOver basique: ordre lecture topbar → contenu → bottom nav.

## 4) Robustesse
- [ ] Basculer `prefers-reduced-motion`: animations minimales ou désactivées.
- [ ] Basculer `data-theme` dark/light et `data-contrast="high"`: contraste AA lisible.
- [ ] Vérifier impression (print): fond blanc, texte noir, cartes lisibles.
