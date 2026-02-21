# Guide UI WMS (iPhone-first, offline, sans dépendances)

## Principes
- UI frame commun: `header` fixe léger, `main` scrollable, `bottom-nav` stable.
- Cibles tactiles minimales 44px.
- Typo minimale 16px pour les champs (évite le zoom iOS).
- Pas d'appel réseau externe, assets locaux uniquement.
- États standards sur toutes listes: chargement / vide / erreur.

## Tokens CSS
- Espacements: `--space-1..6` (4/8/12/16/20/24).
- Radius: `--radius-1..3` (8/12/16).
- Typographie: `--type-12/14/16/18/22/28`.
- Couleurs: `--bg`, `--panel`, `--text`, `--muted`, `--accent`, `--danger`, `--ok`.
- Élévations: `--shadow-1`, `--shadow-2`.

## Composants
- `AppShell`: `.app-frame .app-header .app-content .bottom-nav`
- Cartes: `.card`, variantes header/footer.
- Actions: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`
- Statuts: `.pill`, `.status-pill`, `.badge`, `.chip`
- Navigation: `.bottom-nav` + `.nav-badge` + `aria-current`
- Feedback: `.ui-toast`, `.ui-modal`, `.skeleton-card`, `.empty-state`, `.error-state`
- Données: `.list-dense` / `.list-comfy`, `.accordion-trigger`, `.stepper`

## Règles iPhone
1. Respecter `env(safe-area-inset-*)`.
2. Préserver le scroll par route.
3. Conserver la dernière route active.
4. Réduire les animations via `prefers-reduced-motion`.
5. Éviter les ombres lourdes et reflow coûteux.

## Feature flags
- `UI_FLAGS.swipeToCloseModal` → interactions gestuelles modales (expérimental).
- `UI_FLAGS.nativeQrScan` → scan WebRTC natif (risque iOS).

## Checklist massive des améliorations UI (250 items)

### A) FRAME / LAYOUT (1–40)
1. [DONE] AppShell commun (header/content/bottomnav).
2. [DONE] Safe-area padding top/bottom sur iPhone notch.
3. [DONE] Container max-width + centrage sur desktop.
4. [DONE] Scroll uniquement dans content (pas body).
5. [DONE] Header sticky léger (pas envahissant).
6. [DONE] Bottom nav sticky avec labels courts.
7. [DONE] Bottom nav avec état actif clair.
8. [DONE] Badge compteur sur nav (notifications/tâches).
9. [TODO] Mini “Quick actions” sous header (3 icônes).
10. [TODO] FAB scan (optionnel).
11. [TODO] Layout en “cards grid” sur large écran.
12. [DONE] Spacing scale uniforme (4/8/12/16/20/24).
13. [DONE] Radius tokens (8/12/16).
14. [DONE] Ombres très légères (elevation tokens).
15. [DONE] Séparateurs fins (hairline).
16. [TODO] Compact mode (densité).
17. [TODO] Mode “terrain” (gros boutons).
18. [TODO] Mode “bureau” (plus dense).
19. [DONE] Zones cliquables 44px min.
20. [DONE] Désactiver zoom iOS sur inputs (font-size 16).
21. [TODO] “Scroll to top” discret.
22. [TODO] Panneau statut (offline/ok).
23. [TODO] Bannières d’état (erreur/avert).
24. [DONE] États vides standard (EmptyState).
25. [DONE] États erreur standard (ErrorState).
26. [DONE] Skeleton loader standard.
27. [TODO] Gestion orientation (portrait prioritaire).
28. [TODO] Table responsive → cards.
29. [TODO] “Compact chips” pour tags.
30. [DONE] Padding systématique par section.
31. [DONE] Accent color token.
32. [TODO] Thèmes par entrepôt (LAV/LAN).
33. [TODO] Indicateur de page (breadcrumb minimal).
34. [TODO] Header secondaire repliable.
35. [TODO] Banner “session” (utilisateur).
36. [TODO] “Last saved” timestamp.
37. [TODO] “Undo” après suppression.
38. [TODO] Mode “lecture seule”.
39. [TODO] Support iPad split view.
40. [TODO] Snap scroll pour sections.

### B) TYPO / LISIBILITÉ (41–70)
41. [DONE] Typo scale: 12/14/16/18/22/28.
42. [DONE] Hauteur ligne 1.35–1.5.
43. [DONE] Titres courts, truncation ellipsis.
44. [DONE] Labels secondaires plus doux.
45. [DONE] Contraste AA minimum.
46. [TODO] Option police “grande” (A11y).
47. [DONE] États focus visibles.
48. [DONE] Styles pour code/ID monospace local.
49. [TODO] Ajuster letter-spacing sur badges.
50. [TODO] Icônes inline SVG locales.
51. [DONE] Couleurs d’état (success/warn/danger/info).
52. [DONE] Palette neutre (surfaces).
53. [TODO] Mode daltonisme (patterns).
54. [TODO] Grille typographique (baseline).
55. [DONE] Standardiser marges titres.
56. [TODO] Lire/écrire: tailles pour scan.
57. [TODO] Aide contextuelle (tooltips).
58. [DONE] Micro-copies cohérentes.
59. [TODO] “Helper text” sous champs.
60. [DONE] “Required” clair.
61. [TODO] Prévenir textes trop longs.
62. [DONE] Numéros/quantités alignés.
63. [TODO] Unifier format dates.
64. [TODO] Unifier format IDs (uppercase).
65. [DONE] Chips pour statuts.
66. [TODO] Unifier langue (FR/EN toggle).
67. [TODO] Glossaire interne.
68. [DONE] Style liste dense vs confortable.
69. [TODO] Résumé en haut de page.
70. [TODO] “Print typography” dédiée.

### C) INPUTS / SCAN-FIRST (71–120)
71. [DONE] Champ scan sticky (option).
72. [DONE] Auto-focus au chargement page.
73. [DONE] Auto-select contenu au focus.
74. [DONE] Bouton “coller”/“effacer”.
75. [DONE] Bouton “entrée manuelle” caché.
76. [TODO] Reconnaître scan rapide (debounce).
77. [TODO] Validation instant (check digit).
78. [TODO] Indicateur “scan ok”.
79. [TODO] Son/vibration optionnel (iOS).
80. [DONE] Stepper qty (+/-) grand.
81. [DONE] Long press sur stepper (accélérer).
82. [TODO] Saisie qty par clavier numérique.
83. [DONE] Empêcher scroll jump lors focus.
84. [TODO] Barre action clavier (Done).
85. [DONE] Gestion Enter/Tab.
86. [TODO] Historique scans (10 derniers).
87. [TODO] Auto-suggest items connus.
88. [TODO] Filtre “moins de 20” direct.
89. [TODO] Switch “inclure zéro en réception”.
90. [TODO] Validation bin scan.
91. [TODO] Mode double scan (item→bin).
92. [TODO] Mode “forçage” (justification).
93. [TODO] Popup confirmation qty.
94. [DONE] Toast “ajouté à la liste”.
95. [TODO] Undo sur ajout.
96. [TODO] Mode lot (multi-scan sans popup).
97. [TODO] Raccourcis: “+1”, “+5”.
98. [TODO] Macro actions (Compléter).
99. [TODO] Gestion doublons (merge).
100. [TODO] Alerte si item inconnu.
101. [TODO] Recherche rapide (fuzzy).
102. [TODO] Scanner caméra (si possible, sans lib, fallback).
103. [FLAG] WebRTC scan natif (risque iOS).
104. [TODO] Entrée manuelle guidée.
105. [TODO] Normaliser espaces/retours.
106. [TODO] Trim uppercase auto.
107. [TODO] Empêcher paste accidentel.
108. [TODO] Timer “inactivité”.
109. [TODO] Rappels “penser à valider”.
110. [TODO] Mode gants (boutons plus gros).
111. [TODO] Mode lumière (contrast boost).
112. [TODO] Bouton “re-scan” rapide.
113. [TODO] Bouton “mark printed”.
114. [TODO] Indicateur “QR généré”.
115. [TODO] Scan QR palette.
116. [TODO] Liste par zone/secteur (tri).
117. [TODO] Group header sticky.
118. [TODO] Expand/collapse groupe.
119. [TODO] Multi-select items.
120. [TODO] Actions bulk (export/print).

### D) LISTES / CARTES / ACCORDÉONS (121–170)
121. [DONE] Card standard pour item.
122. [DONE] Ligne principale + sous-ligne.
123. [DONE] Actions à droite (icônes).
124. [DONE] Accordéon par section.
125. [TODO] Accordéon “ouvrir dernier utilisé”.
126. [TODO] “Expand all / collapse all”.
127. [TODO] Sticky group totals.
128. [TODO] Totaux par groupe (qty).
129. [TODO] Tri: zone→allée→bin.
130. [TODO] Tri: qty asc/desc.
131. [TODO] Swipe actions (delete/edit).
132. [FLAG] Swipe iOS custom (risque).
133. [TODO] Drag & drop reorder (desktop).
134. [TODO] Pagination virtuelle (long lists).
135. [DONE] Skeleton card.
136. [DONE] Empty card message.
137. [TODO] “Pin” un item important.
138. [TODO] Highlights <20.
139. [TODO] Badges par statut.
140. [TODO] Réduire jitter (contain/layout).
141. [TODO] “Peek” détails (modal).
142. [DONE] Modal détails item.
143. [TODO] Modal actions (Briser/Rebox).
144. [TODO] Modal confirm destructive.
145. [DONE] Bouton danger rouge.
146. [TODO] Button loading state.
147. [DONE] Disabled state.
148. [TODO] Tooltip sur actions.
149. [TODO] Format impression friendly.
150. [TODO] “Copy ID” bouton.
151. [TODO] “Share” fichier local (fallback).
152. [TODO] “Mark done” item.
153. [TODO] Progress bar liste.
154. [TODO] Mini timeline des opérations.
155. [TODO] “Recent exports”.
156. [TODO] “Recent imports”.
157. [TODO] “Favorites” zones.
158. [TODO] “Jump to zone”.
159. [TODO] Sticky index A-Z (si applicable).
160. [TODO] Compact rows mode.
161. [TODO] Table view toggle.
162. [TODO] “Show only exceptions”.
163. [TODO] “Show only unknown”.
164. [TODO] “Show only zero”.
165. [TODO] “Show only scanned today”.
166. [TODO] Multi-day filter.
167. [TODO] Color-coded sector strip.
168. [TODO] Readonly mode for supervisors.
169. [TODO] Print preview modal.
170. [TODO] PDF export preview.

### E) NAV / ROUTER / ÉTATS (171–210)
171. [DONE] Router transitions non agressives.
172. [DONE] Preserve scroll par page.
173. [DONE] Preserve last tab.
174. [TODO] Deep links hash routes.
175. [TODO] Back button iOS safe.
176. [TODO] Guard “unsaved changes”.
177. [TODO] Loading overlay route.
178. [TODO] Error boundary route.
179. [TODO] 404 page interne.
180. [TODO] Route param (id).
181. [TODO] Breadcrumb minimal.
182. [TODO] Page title update.
183. [TODO] Nav badges dynamiques.
184. [TODO] “Offline mode” badge.
185. [TODO] “Sync pending” badge.
186. [TODO] Shortcuts page.
187. [TODO] Search global.
188. [TODO] Recent pages.
189. [TODO] Quick switch warehouse.
190. [TODO] Multi-profile user.
191. [TODO] Permissions terrain/superviseur.
192. [TODO] Lock screen mode.
193. [TODO] Auto logout (option).
194. [TODO] Session banner.
195. [TODO] Debug panel (hidden).
196. [TODO] Build info footer.
197. [TODO] Reset app button.
198. [TODO] Import/export settings.
199. [TODO] Crash-safe localStorage writes.
200. [TODO] Migration storage versioning.
201. [TODO] Feature flags registry.
202. [TODO] Toggle experimental UI.
203. [TODO] Navigation haptics.
204. [TODO] Keyboard nav desktop.
205. [TODO] “Skip to content” a11y.
206. [TODO] Focus trap modals.
207. [DONE] Escape closes modal.
208. [TODO] Touch outside closes (option).
209. [TODO] “Hold to confirm” destructive.
210. [TODO] “Double confirm” for delete all.

### F) PERFORMANCE / STABILITÉ (211–250)
211. [DONE] Passive listeners for scroll/touch.
212. [DONE] Debounce input handlers.
213. [DONE] Reduce DOM depth.
214. [DONE] Use requestAnimationFrame for UI updates.
215. [TODO] Virtualize long lists.
216. [TODO] Avoid layout thrash (measure once).
217. [DONE] CSS contain: content where possible.
218. [DONE] Avoid heavy shadows.
219. [DONE] Prefer transform/opacity.
220. [DONE] Reduced motion support.
221. [TODO] Cache parsed JSON.
222. [TODO] Incremental render groups.
223. [TODO] Idle callback for non-critical.
224. [TODO] Compression JSON (optional).
225. [TODO] Split data files.
226. [TODO] Memory guard for huge KB.
227. [TODO] “Low power mode” detection (approx).
228. [TODO] Disable animations on low power.
229. [TODO] Print CSS optimized.
230. [TODO] Avoid synchronous localStorage spam.
231. [TODO] Batch writes.
232. [TODO] Add try/catch around storage.
233. [TODO] Log errors local.
234. [TODO] Export diagnostics.
235. [TODO] Remove unused CSS.
236. [TODO] CSS minify (optional).
237. [TODO] Use rel=preload for local css.
238. [TODO] Defer non-critical scripts.
239. [TODO] Use module scripts if safe.
240. [TODO] Service worker cache strategy tuned.
241. [TODO] Offline fallback page.
242. [TODO] Cache busting version.
243. [TODO] “Clear cache” button.
244. [TODO] Prevent double submits.
245. [TODO] Lock buttons while processing.
246. [TODO] Microtask queue for UI.
247. [TODO] Measure perf timestamps.
248. [TODO] FPS friendly scrolling.
249. [TODO] Avoid huge innerHTML.
250. [TODO] Secure sanitize template inserts.
