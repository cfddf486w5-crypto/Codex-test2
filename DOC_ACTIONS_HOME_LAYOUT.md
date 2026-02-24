# DOC_ACTIONS_HOME_LAYOUT

## Règles globales
- Offline-first: toutes les actions utilisent localStorage/IndexedDB, sans API.
- Paramètres global uniques: page `parametres`, section `settings-layout`.
- Historique global: ouverture via `window.DLWMS_openHistory(...)` depuis Home et Layout.

## Clés de stockage
- `DLWMS_LAYOUTS_V1`: layouts sauvegardés.
- `DLWMS_LAYOUT_LAST_ID`: layout actif.
- `DLWMS_LAYOUT_PREFS_V1`: préférences layout (autosave, coords, brush, favoris).
- `DLWMS_LAYOUT_TILESET_V1`: tileset custom (prévu backup).
- `DLWMS_BINMAP`: mapping bins requis pour certains flux Home.
- `layoutCellClipboard` (sessionStorage): copie/coller case.

## A) HOME — boutons/actions
| ID | Emplacement | Action |
|---|---|---|
| BTN_NAV_MODULES | Home section Modules | `navigate('modules')` |
| BTN_HOME_HISTORY | Home section Modules | `window.DLWMS_openHistory({module:'all'})` + focus filtre |
| BTN_NAV_SETTINGS | Home section Modules | `navigate('parametres')` |
| CARD_QUICK_RECEIPT_CONTAINER | Actions rapides | `window.DLWMS_openReceptionConteneur()` |
| CARD_QUICK_CONSOLIDATION | Actions rapides | `navigate('consolidation')` |
| CARD_QUICK_INVENTORY | Actions rapides | `navigate('inventaire')` |
| CARD_QUICK_SHIPPING_TRACK | Actions rapides | `navigate('monitoring')` (désactivé sans bin map) |
| CARD_QUICK_RESTOCK | Actions rapides | `navigate('remise')` (désactivé sans bin map) |
| CARD_QUICK_LAYOUT | Actions rapides | `navigate('layout')` |
| BTN_HOME_EXPORT_BACKUP | Outils | Export JSON global (IndexedDB + settings/layout/binmap) |
| BTN_HOME_IMPORT_BACKUP | Outils | Import JSON + merge des clés locales |
| BTN_HOME_HELP_FAQ | Outils | `navigate('reception-faq')` |
| BTN_HOME_STORAGE_STATUS | Top actions | Modal santé stockage localStorage + IndexedDB |
| BTN_HOME_OFFLINE_BADGE | Top actions | Modal conseils offline |

## B) LAYOUT — boutons/actions
| ID | Zone | Action |
|---|---|---|
| BTN_LAYOUT_OPEN_SETTINGS | Topbar layout | `window.DLWMS_openSettings({section:'layout'})` |
| DROPDOWN_LAYOUT_SELECT | Topbar layout | charge layout, autosave précédent, set `DLWMS_LAYOUT_LAST_ID` |
| TOOL_SELECT | Toolbar | mode sélection |
| TOOL_PEN | Toolbar | peinture type actif |
| TOOL_ERASER | Toolbar | type `TILE_EMPTY` |
| TOOL_FILL | Toolbar | flood fill avec confirmation >100 cases |
| TOOL_RECT | Toolbar | remplissage rectangle |
| TOOL_TEXT_LABEL | Toolbar | label case via prompt |
| TOOL_MEASURE | Toolbar | mesure Manhattan en cases |
| BTN_ZOOM_IN / BTN_ZOOM_OUT / BTN_ZOOM_FIT | Zoom | zoom +/-10% / reset |
| TOGGLE_PAN_MODE | Zoom | toggled info pan |
| BTN_UNDO / BTN_REDO | Historique action | piles undo/redo |
| TOGGLE_AUTOSAVE | Préf | toggle + persistance `DLWMS_LAYOUT_PREFS_V1` |
| BTN_TILE_PICKER | Palette | sélection type actif |
| BTN_TILE_FAVORITES | Palette | favori dans prefs |
| BTN_CELL_CHANGE_TYPE | Sheet case | applique type actif |
| BTN_CELL_EDIT_LABEL | Sheet case | édite label |
| BTN_CELL_CLEAR | Sheet case | `TILE_EMPTY` |
| BTN_CELL_COPY / BTN_CELL_PASTE | Sheet case | copie/colle propriétés via sessionStorage |
| BTN_GRID_RESIZE | Grille | change rows/cols (add/crop) |
| BTN_GRID_TOGGLE_COORDS | Grille | afficher/masquer coordonnées |
| BTN_GRID_SNAP | Grille | toggle snap (état info) |
| BTN_LAYOUT_EXPORT_JSON | Export | JSON complet layout/meta/légende |
| BTN_LAYOUT_IMPORT_JSON | Import | validation structure + upsert layout |
| BTN_LAYOUT_EXPORT_PNG | Export | fallback warning |
| BTN_LAYOUT_EXPORT_PDF | Export | impression locale |
| BTN_LAYOUT_EXPORT_LEGEND | Export | JSON légende |
| BTN_LAYOUT_VIEW_CHANGES | Historique | `window.DLWMS_openHistory({module:'layout'})` |

## Types de cases minimum
`TILE_EMPTY`, `TILE_AISLE`, `TILE_WALL`, `TILE_DOOR`, `TILE_RACK`, `TILE_PILLAR`, `TILE_DOCK`, `TILE_OFFICE`, `TILE_NO_GO`, `TILE_ZONE`, `TILE_STAIRS`, `TILE_ELEVATOR`, `TILE_PARKING`, `TILE_CHARGING`.
