(() => {
  const I18N = {
    fr: {
      appTitle: 'Remise en stock',
      home: 'Accueil',
    },
    en: { appTitle: 'Putaway', home: 'Home' }
  };
  const locale = 'fr';

  const FAQ_FIXE = [
    { q: 'C’est quoi le but de la page Remise en stock ?', a: 'Générer une remise puis la traiter avec un workflow contrôlé (scan item puis scan bin) avec historique complet.', tags: ['but', 'workflow', 'remise'], sources: ['Règle: génération 1 scan = 1 pièce', 'Règle: traitement item -> bin', 'Règle: historique/logs'] },
    { q: 'Comment je génère une nouvelle remise ?', a: 'Accueil > Générer une remise, scanne chaque item (1 scan = 1 pièce), puis clique Compléter remise et scanne LAVREMPxx si demandé.', tags: ['générer', 'scan'], sources: ['Écran: Générer une remise', 'Règle: 1 scan = 1 pièce', 'Règle: Compléter remise -> archive + optimise'] },
    { q: 'Pourquoi 1 scan = 1 pièce ?', a: 'Chaque scan représente une unité réelle pour réduire les erreurs de comptage.', tags: ['règle', 'scan', 'quantité'], sources: ['Règle: scan item (1 scan = 1 pièce)'] },
    { q: 'Je peux entrer une quantité au lieu de scanner ?', a: 'Par défaut non, la saisie manuelle (✍️) est une exception et le scan reste prioritaire.', tags: ['manuel', 'quantité'], sources: ['Règle: entrée manuelle cachée derrière icône', 'Règle: scan prioritaire'] },
    { q: 'Comment je supprime un item de la liste en génération ?', a: 'Tape sur l’item puis choisis Supprimer.', tags: ['supprimer', 'génération'], sources: ['Règle: tap item -> popup actions (Supprimer)'] },
    { q: 'C’est quoi Briser ?', a: 'Briser envoie l’unité au flux Scrap avec scan item + ScrapBox obligatoires et log complet.', tags: ['briser', 'scrap'], sources: ['Règle: Briser -> Scrap + scans obligatoires + log'] },
    { q: 'C’est quoi Rebox ?', a: 'Rebox marque l’unité pour ré-emballage et la traite en fin de parcours dans une zone dédiée.', tags: ['rebox', 'emballage'], sources: ['Règle: Rebox = zone fin parcours'] },
    { q: 'Pourquoi Rebox est à la fin du parcours ?', a: 'Pour éviter les retours en arrière et réduire les déplacements.', tags: ['rebox', 'optimisation'], sources: ['Règle: Rebox en fin de parcours', 'Règle: tri/chemin optimisé'] },
    { q: 'C’est quoi Compléter remise ?', a: 'Ça clôture la génération, archive le brouillon et crée une remise officielle LAVREMxxxx triée Zone→Allée→Bin.', tags: ['compléter', 'optimiser'], sources: ['Règle: Compléter -> archive + optimise + Prochaine remise'] },
    { q: 'Quel format pour une remise ?', a: 'LAVREM0001 (sans tirets).', tags: ['format', 'lavrem'], sources: ['Règle: ID remise = LAVREM0001'] },
    { q: 'Quel format pour un panier/palette ?', a: 'LAVREMP01 (sans tirets).', tags: ['format', 'lavremp'], sources: ['Règle: panier = LAVREMP01'] },
    { q: 'Que faire si je scanne un ID invalide ?', a: 'Remise = LAVREM + 4 chiffres, Panier = LAVREMP + 2 chiffres. Corrige et rescane.', tags: ['erreur', 'format'], sources: ['Validation: ^LAVREM\\d{4}$', 'Validation: ^LAVREMP\\d{2}$'] },
    { q: 'Comment je traite une remise ?', a: 'Accueil > Prochaine remise, puis scanne/sélectionne un ID LAVREMxxxx.', tags: ['traiter', 'prochaine'], sources: ['Écran: Prochaine remise', 'Écran: Traitement'] },
    { q: 'Pourquoi scanner le bin ?', a: 'Pour valider le bon emplacement et éviter les erreurs d’inventaire.', tags: ['bin', 'qualité'], sources: ['Règle: confirmation bin', 'Pourquoi?: contrôle qualité'] },
    { q: 'Confirmation bin seulement quand il reste 1 unité ?', a: 'Oui, à qty=1 l’app confirme le produit puis passe en mode confirmer bin.', tags: ['qty', 'bin'], sources: ['Règle: si qty=1 -> popup produit confirmé -> confirmer bin'] },
    { q: 'Quand apparaît Produit confirmé ?', a: 'Quand tu scannes l’item de la dernière unité (qty restante = 1).', tags: ['popup', 'qty'], sources: ['Règle: qty=1 popup produit confirmé'] },
    { q: 'Quand apparaît Remise complète ?', a: 'Après scan du bon bin en mode confirmer bin.', tags: ['popup', 'bin'], sources: ['Règle: scan bin -> popup remise complète -> next produit'] },
    { q: 'Je peux revenir en arrière ?', a: 'Oui, Retour/Annuler restaure qty et mode de scan.', tags: ['annuler', 'undo'], sources: ['Règle: toujours offrir Annuler/Retour arrière'] },
    { q: 'C’est quoi Forcer ?', a: 'Forcer complète une ligne en exception avec justification obligatoire et log tagué FORCED.', tags: ['forcer', 'override'], sources: ['Règle: Forcer + justification obligatoire + log'] },
    { q: 'Pourquoi justification obligatoire en Forcer ?', a: 'Pour la traçabilité et les audits qualité.', tags: ['forcer', 'audit'], sources: ['Pourquoi?: Forcer = traçabilité + audit'] },
    { q: 'Je peux forcer si qty restante = 1 ?', a: 'Normalement non, le flux doit confirmer item puis bin.', tags: ['forcer', 'qty'], sources: ['Règle: Forcer visible surtout si qty restante > 1'] },
    { q: 'Le scan ne rentre pas, que faire ?', a: 'Vérifie le focus du champ scan, ferme les modals, puis utilise ✍️ en dernier recours.', tags: ['scan', 'dépannage'], sources: ['Règle: focus scan permanent', 'Règle: entrée manuelle cachée'] },
    { q: 'Pourquoi un scan répété est ignoré ?', a: 'Anti double-scan: même valeur reçue trop vite (ex 300ms) ignorée.', tags: ['double-scan', 'debounce'], sources: ['Règle: anti double scan (300ms)'] },
    { q: 'Comment l’ordre des produits est déterminé ?', a: 'Tri optimisé Zone→Allée→Bin selon l’ordre des zones des Paramètres.', tags: ['ordre', 'tri'], sources: ['Règle: tri Zone→Allée→Bin', 'Paramètres: ordre des zones'] },
    { q: 'Je veux changer l’ordre des zones ?', a: 'Paramètres > Ordre des zones puis sauvegarde.', tags: ['zones', 'paramètres'], sources: ['Paramètres: zoneOrder editable'] },
    { q: 'Ça fonctionne sans internet ?', a: 'Oui, données et IA sont locales (FAQ + KB + stockage local).', tags: ['offline', 'internet'], sources: ['Règle: offline-first', 'Règle: IA offline KB'] },
    { q: 'Comment changer d’utilisateur ?', a: 'Paramètres > Utilisateurs puis sélectionne l’utilisateur actif.', tags: ['utilisateur'], sources: ['Règle: users persistés + user actif sur logs'] },
    { q: 'Où voir l’historique ?', a: 'Accueil > Historique pour détails et logs des remises.', tags: ['historique'], sources: ['Écran: Historique'] },
    { q: 'Je peux exporter les données ?', a: 'Oui, JSON complet et CSV remises/scrap depuis Historique.', tags: ['export', 'json', 'csv'], sources: ['Règle: export JSON', 'Règle: export CSV'] },
    { q: 'Je peux importer des données ?', a: 'Oui via Paramètres > Import JSON avec fusion et dédoublonnage.', tags: ['import', 'merge'], sources: ['Règle: import JSON merge + dédoublonnage'] },
    { q: 'Comment gérer le Scrap exactement ?', a: 'Tap item > Briser puis scan item + scan ScrapBox, ensuite log complet.', tags: ['scrap', 'scrapbox'], sources: ['Règle: Briser -> scans obligatoires + log'] },
    { q: 'Qu’est-ce qu’un ScrapBox valide ?', a: 'SCRAPBOX + chiffre (ex SCRAPBOX1), sinon refus.', tags: ['scrapbox', 'validation'], sources: ['Validation ScrapBox: ^SCRAPBOX\\d+$'] },
    { q: 'Item sans mapping zone/allée/bin, ça marche ?', a: 'Oui, la remise fonctionne même avec champs emplacement vides.', tags: ['mapping'], sources: ['Règle: mapping optionnel'] },
    { q: 'C’est quoi le mapping CSV ?', a: 'Un fichier item -> description/zone/allée/bin pour guider et trier.', tags: ['csv', 'mapping'], sources: ['Import: CSV mapping items'] },
    { q: 'Fin de remise, quoi faire ?', a: 'Choisir Prochaine remise ou Générer une remise.', tags: ['fin'], sources: ['Règle: fin => Prochaine remise ou Générer'] },
    { q: 'Pourquoi revenir vers la zone Remise à la fin ?', a: 'Pour enchaîner sans déplacements inutiles.', tags: ['fin', 'organisation'], sources: ['Règle: opérateur revient proche zone remise'] },
    { q: 'Bouton Compléter remise grisé, pourquoi ?', a: 'Liste vide ou action obligatoire incomplète (ex ScrapBox manquante).', tags: ['compléter', 'erreur'], sources: ['Règle: état valide requis pour complétion'] },
    { q: 'Message format invalide, quoi vérifier ?', a: 'Type d’ID, longueur et zéros (LAVREM0001 / LAVREMP01).', tags: ['format', 'invalide'], sources: ['Validation ID remise/panier'] },
    { q: 'Différence pending / in_progress / done ?', a: 'pending=créée, in_progress=démarrée, done=terminée.', tags: ['statut'], sources: ['Règle: status pending|in_progress|done'] },
    { q: 'Comment l’IA répond sans internet ?', a: 'Avec FAQ fixe + notes KB + règles internes et sources locales.', tags: ['ia', 'offline'], sources: ['Règle: IA KB offline (FAQ + notes + règles)'] },
    { q: 'Je peux ajouter mes réponses IA ?', a: 'Oui, Paramètres > KB pour notes Q/R locales exportables.', tags: ['ia', 'kb'], sources: ['Règle: KB notes éditables persistées + export/import'] },
    { q: 'Erreur scan bin, que faire ?', a: 'Rescanner le bon bin attendu affiché sur la ligne.', tags: ['bin', 'erreur'], sources: ['Règle: confirmation bin obligatoire'] },
    { q: 'Erreur scan item en traitement ?', a: 'Le SKU scanné doit correspondre à la ligne active.', tags: ['item', 'erreur'], sources: ['Règle: validation item attendu'] },
    { q: 'Comment exporter seulement les remises ?', a: 'Historique > Export CSV remises.', tags: ['export', 'csv'], sources: ['Écran: Historique export remises'] },
    { q: 'Comment exporter le log scrap ?', a: 'Historique > Export CSV scrap log.', tags: ['export', 'scrap'], sources: ['Écran: Historique export scrap'] },
    { q: 'Comment importer un mapping CSV ?', a: 'Paramètres > Import mapping CSV puis sélectionner le fichier.', tags: ['import', 'csv'], sources: ['Écran: Paramètres import mapping CSV'] },
    { q: 'Comment activer/désactiver confirmation bin ?', a: 'Paramètres > Exiger confirmation bin.', tags: ['paramètres', 'bin'], sources: ['Paramètres: requireBinConfirm'] },
    { q: 'Comment régler anti double scan ?', a: 'Paramètres > Anti double-scan (ms).', tags: ['debounce', 'paramètres'], sources: ['Paramètres: scanDebounceMs'] },
    { q: 'Comment reset debug ?', a: 'Paramètres > Debug > Reset local.', tags: ['reset', 'debug'], sources: ['Écran: Paramètres Debug'] },
    { q: 'Comment utiliser mode embedded DL.WMS ?', a: 'Ajouter ?embedded=1 pour activer l’en-tête compact avec bouton Retour.', tags: ['embedded', 'mode'], sources: ['Règle: embedded mode via query param'] },
    { q: 'Pourquoi tri Zone→Allée→Bin ?', a: 'Pour un chemin optimisé et moins de déplacements.', tags: ['pourquoi', 'tri'], sources: ['Pourquoi?: tri optimisé'] },
    { q: 'Pourquoi confirmer bin ?', a: 'Assure la remise au bon emplacement.', tags: ['pourquoi', 'bin'], sources: ['Pourquoi?: contrôle qualité bin'] },
    { q: 'Pourquoi Forcer est audité ?', a: 'Pour expliquer les écarts et limiter les pertes inventaire.', tags: ['pourquoi', 'forcer'], sources: ['Pourquoi?: traçabilité + audit'] },
    { q: 'Pourquoi Rebox en fin ?', a: 'Évite les retours en arrière dans le parcours.', tags: ['pourquoi', 'rebox'], sources: ['Pourquoi?: Rebox en fin'] },
    { q: 'Scan vide ?', a: 'Rien scanné, recommence.', tags: ['erreur', 'scan'], sources: ['Règle erreur: scan vide'] },
    { q: 'Forcer sans justification ?', a: 'Refusé: ajoute une justification valide.', tags: ['erreur', 'forcer'], sources: ['Règle erreur: forcer sans justification'] },
    { q: 'Scrap sans ScrapBox ?', a: 'Refusé: scan ScrapBox obligatoire.', tags: ['erreur', 'scrap'], sources: ['Règle erreur: scrap sans ScrapBox'] },
    { q: 'Double scan rapide ?', a: 'Double scan ignoré (anti double-scan).', tags: ['erreur', 'double-scan'], sources: ['Règle erreur: anti double-scan'] },
    { q: 'Comment ouvrir Prochaine remise rapidement ?', a: 'Depuis Accueil, clique Prochaine remise.', tags: ['navigation'], sources: ['Écran: Accueil'] },
    { q: 'Comment ouvrir Générer une remise rapidement ?', a: 'Depuis Accueil, clique Générer une remise.', tags: ['navigation'], sources: ['Écran: Accueil'] },
    { q: 'Comment annuler la dernière action en traitement ?', a: 'Utilise le bouton Annuler pour restaurer la quantité précédente.', tags: ['annuler', 'traitement'], sources: ['Règle: Annuler restaure état'] },
    { q: 'Quand le bouton Forcer apparaît ?', a: 'Surtout quand qty restante > 1.', tags: ['forcer', 'ui'], sources: ['Règle: visibilité Forcer'] },
    { q: 'Que contient le log remise ?', a: 'Date/heure, utilisateur, type d’action et données de scan.', tags: ['logs'], sources: ['Règle: logs détaillés'] },
    { q: 'Que contient le log scrap ?', a: 'Date/heure, user, SKU, remise/panier, ScrapBox, zone/bin, qty.', tags: ['logs', 'scrap'], sources: ['Règle: scrap log complet'] },
    { q: 'Comment sont créés les IDs ?', a: 'Auto-incrément local: LAVREMxxxx et LAVREMPxx.', tags: ['id', 'format'], sources: ['Règle: nextIds locale'] },
    { q: 'Le système garde les données après fermeture ?', a: 'Oui, stockage local IndexedDB/LocalStorage.', tags: ['offline', 'stockage'], sources: ['Règle: persistance locale'] },
    { q: 'Les notes KB sont persistées ?', a: 'Oui, elles restent locales et sont incluses dans l’export JSON.', tags: ['kb', 'persist'], sources: ['Règle: kb_notes persistées'] },
    { q: 'L’historique chat IA est sauvegardé ?', a: 'Oui, chaque échange IA est enregistré localement.', tags: ['ia', 'chat'], sources: ['Règle: chat history persisté'] },
    { q: 'Peut-on exporter l’historique chat ?', a: 'Oui, il est inclus dans l’export JSON complet.', tags: ['ia', 'export'], sources: ['Règle: export JSON complet'] },
    { q: 'Peut-on importer l’historique chat ?', a: 'Oui via Import JSON, avec fusion dédoublonnée.', tags: ['ia', 'import'], sources: ['Règle: import JSON merge'] },
    { q: 'Que faire si modal bloque le scan ?', a: 'Ferme la fenêtre modale puis rescane.', tags: ['scan', 'modal'], sources: ['Règle: focus scan et modal'] },
    { q: 'Comment ajouter un utilisateur ?', a: 'Paramètres > Utilisateurs > Ajouter utilisateur.', tags: ['utilisateur'], sources: ['Écran: Paramètres utilisateurs'] },
    { q: 'Comment changer utilisateur actif ?', a: 'Dans Paramètres, clique le nom du user voulu.', tags: ['utilisateur'], sources: ['Écran: Paramètres utilisateurs'] },
    { q: 'Comment ajouter une note KB ?', a: 'Paramètres > KB notes IA > Ajouter note Q/R.', tags: ['kb', 'notes'], sources: ['Écran: Paramètres KB'] },
    { q: 'Comment supprimer une note KB ?', a: 'Dans Paramètres > KB, clique Supprimer sur la note.', tags: ['kb', 'notes'], sources: ['Écran: Paramètres KB'] },
    { q: 'Comment démarrer avec des données de test ?', a: 'Paramètres > Debug > Générer données exemple.', tags: ['debug', 'seed'], sources: ['Écran: Paramètres Debug'] },
    { q: 'Comment nettoyer toutes les données locales ?', a: 'Paramètres > Debug > Reset local (effacement complet).', tags: ['debug', 'reset'], sources: ['Écran: Paramètres Debug'] },
    { q: 'Le tri des zones est personnalisable ?', a: 'Oui via le champ Zones (ordre custom) en Paramètres.', tags: ['zones', 'paramètres'], sources: ['Paramètres: zoneOrder'] },
    { q: 'Comment scanner une remise existante ?', a: 'Dans Prochaine remise, scanne LAVREMxxxx dans le champ prévu.', tags: ['remise', 'scan'], sources: ['Écran: Prochaine remise'] },
    { q: 'Comment scanner un panier lors de la complétion ?', a: 'Lors de Compléter remise, scanne LAVREMPxx.', tags: ['panier', 'scan'], sources: ['Règle: demande panier à la complétion'] },
    { q: 'Que se passe-t-il après scan item correct ?', a: 'La qty restante diminue, puis l’app peut demander confirmation bin.', tags: ['traitement', 'scan'], sources: ['Règle: scan item décrémente qty'] },
    { q: 'Que se passe-t-il après scan bin correct ?', a: 'Ligne terminée et passage automatique au prochain produit.', tags: ['traitement', 'bin'], sources: ['Règle: scan bin valide -> next produit'] },
    { q: 'Comment reconnaître un code remise valide ?', a: 'Regex: ^LAVREM\\d{4}$, exemple LAVREM0007.', tags: ['regex', 'lavrem'], sources: ['Validation regex remise'] },
    { q: 'Comment reconnaître un code panier valide ?', a: 'Regex: ^LAVREMP\\d{2}$, exemple LAVREMP03.', tags: ['regex', 'lavremp'], sources: ['Validation regex panier'] },
    { q: 'Comment éviter les erreurs de scan ?', a: 'Scanner posément, vérifier le champ actif et respecter le debounce.', tags: ['scan', 'qualité'], sources: ['Règle: focus scan + anti double-scan'] },
    { q: 'Quelle est la logique de priorité IA ?', a: 'Erreurs critiques > intention détectée > FAQ/KB correspondante > fallback.', tags: ['ia', 'règles'], sources: ['Règle: moteur intentions priorisé'] },
    { q: 'Quel format de réponse donne l’IA ?', a: 'Résumé, Étapes, Pourquoi, Où cliquer, Sources internes.', tags: ['ia', 'format'], sources: ['Règle: format réponse IA obligatoire'] }
  ];

  const INTENTS = {
    AIDE_GENERALE: ['aide', 'comment', 'expliquer', 'marche', 'workflow'],
    GENERER_REMISE: ['generer', 'creer', 'nouvelle', 'remise', 'scan', 'construire', 'liste'],
    ACTION_ITEM: ['briser', 'scrap', 'rebox', 'supprimer', 'annuler'],
    SCRAP_PROC: ['scrapbox', 'scrap', 'briser', 'bac', 'rebut'],
    REBOX_PROC: ['rebox', 'reemballer', 'emballage'],
    TRAITEMENT_REMISE: ['prochaine', 'traiter', 'processing', 'etape'],
    CONFIRMER_BIN: ['confirmer', 'bin', 'emplacement', 'bac', 'location'],
    FORCER: ['forcer', 'skip', 'override', 'completer'],
    IDS: ['lavrem', 'lavremp', 'format', 'numero', 'id', 'panier', 'remise'],
    EXPORT_IMPORT: ['exporter', 'importer', 'csv', 'excel', 'json'],
    UTILISATEURS: ['user', 'utilisateur', 'operateur', 'changer'],
    PARAMETRES: ['parametres', 'settings', 'debounce', 'double', 'scan', 'zones']
  };

  const state = {
    route: location.hash || '#home',
    db: null,
    data: null,
    currentDraft: null,
    selectedRemiseId: null,
    treatIndex: 0,
    scanMode: 'item',
    lastScan: { value: '', at: 0 },
    whyContext: null
  };

  const defaults = {
    users: [{ id: 'u1', name: 'Opérateur Laval', active: true }],
    baskets: [], remises: [], itemsMap: {}, actions: [], scrapLogs: [], tasks: [],
    kb_notes: [],
    kb_faq: FAQ_FIXE,
    ai_chat_history: [],
    settings: {
      scanDebounceMs: 300,
      requireBinConfirm: true,
      includeReboxAtEnd: true,
      zoneOrder: ['A', 'B', 'C', 'D', 'Rebox'],
      autoFocus: true,
      beepEnabled: false
    },
    nextIds: { remise: 1, basket: 1 }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const nowIso = () => new Date().toISOString();
  const activeUser = () => state.data.users.find(u => u.active) || state.data.users[0];
  const vibrate = () => navigator.vibrate && navigator.vibrate(30);

  const store = {
    key: 'dlwms_remise_v1',
    async init() {
      if ('indexedDB' in window) {
        try {
          state.db = await this.openIDB();
          state.data = await this.readIDB();
          return;
        } catch (_) {}
      }
      const raw = localStorage.getItem(this.key);
      state.data = raw ? JSON.parse(raw) : clone(defaults);
      this.ensure();
      this.flushLS();
    },
    ensure() {
      state.data = Object.assign(clone(defaults), state.data || {});
      state.data.settings = Object.assign(clone(defaults.settings), state.data.settings || {});
      if (!Array.isArray(state.data.kb_faq) || state.data.kb_faq.length < 80) state.data.kb_faq = clone(FAQ_FIXE);
      state.data.ai_chat_history = Array.isArray(state.data.ai_chat_history) ? state.data.ai_chat_history : [];
    },
    openIDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('dlwms_remise_db', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('main');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    readIDB() {
      return new Promise((resolve, reject) => {
        const tx = state.db.transaction('main', 'readonly');
        const rq = tx.objectStore('main').get('state');
        rq.onsuccess = () => { resolve(rq.result || clone(defaults)); this.ensure(); };
        rq.onerror = () => reject(rq.error);
      });
    },
    flushLS() { localStorage.setItem(this.key, JSON.stringify(state.data)); },
    async save() {
      this.ensure();
      if (state.db) {
        await new Promise((resolve, reject) => {
          const tx = state.db.transaction('main', 'readwrite');
          tx.objectStore('main').put(clone(state.data), 'state');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } else {
        this.flushLS();
      }
    }
  };

  function parseAlphaNum(s = '') {
    const m = String(s).match(/([a-zA-Z]*)(\d*)/);
    return { txt: (m?.[1] || '').toUpperCase(), num: parseInt(m?.[2] || '0', 10) };
  }

  function compareLoc(a, b) {
    const zoneOrder = state.data.settings.zoneOrder;
    const za = zoneOrder.indexOf(a.zone); const zb = zoneOrder.indexOf(b.zone);
    if (za !== zb) return (za === -1 ? 999 : za) - (zb === -1 ? 999 : zb);
    const aa = parseAlphaNum(a.aisle); const ab = parseAlphaNum(b.aisle);
    if (aa.txt !== ab.txt) return aa.txt.localeCompare(ab.txt);
    if (aa.num !== ab.num) return aa.num - ab.num;
    const ba = parseAlphaNum(a.bin); const bb = parseAlphaNum(b.bin);
    if (ba.txt !== bb.txt) return ba.txt.localeCompare(bb.txt);
    return ba.num - bb.num;
  }

  function nextRemiseId() {
    const n = state.data.nextIds.remise++;
    return `LAVREM${String(n).padStart(4, '0')}`;
  }
  function nextBasketId() {
    const n = state.data.nextIds.basket++;
    return `LAVREMP${String(n).padStart(2, '0')}`;
  }

  function normalizeScan(v) { return v.trim().toUpperCase(); }
  function antiDouble(v) {
    const t = Date.now();
    const ms = state.data.settings.scanDebounceMs;
    if (state.lastScan.value === v && t - state.lastScan.at < ms) return false;
    state.lastScan = { value: v, at: t };
    return true;
  }

  function beep() {
    if (!state.data.settings.beepEnabled) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = .05;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .08);
    } catch (_) {}
  }

  function toast(msg) {
    const old = $('#toast'); if (old) old.remove();
    const n = $('#tplToast').content.firstElementChild.cloneNode(true);
    n.textContent = msg; document.body.appendChild(n); setTimeout(() => n.remove(), 1700);
  }

  function openModal(node) {
    const backdrop = $('#modalBackdrop'); backdrop.innerHTML = ''; backdrop.appendChild(node); backdrop.classList.remove('hidden');
  }
  function closeModal() { $('#modalBackdrop').classList.add('hidden'); $('#modalBackdrop').innerHTML = ''; focusScan(); }

  function promptInput({ title, desc, placeholder = '', validate = () => true }) {
    return new Promise((resolve) => {
      const n = $('#tplPrompt').content.firstElementChild.cloneNode(true);
      $('#promptTitle', n).textContent = title;
      $('#promptDesc', n).textContent = desc;
      const input = $('#promptInput', n); input.placeholder = placeholder;
      $$('[data-act]', n).forEach(btn => btn.onclick = () => {
        if (btn.dataset.act === 'cancel') return closeModal(), resolve(null);
        if (!validate(input.value)) return toast('Valeur invalide');
        closeModal(); resolve(input.value.trim());
      });
      openModal(n); setTimeout(() => input.focus(), 50);
    });
  }

  function layout(header, content) {
    $('#topHeader').innerHTML = header;
    $('#routeView').innerHTML = content;
    wireScanInput();
  }

  function embeddedMode() {
    const q = new URLSearchParams(location.search);
    return q.get('embedded') === '1';
  }

  function renderHome() {
    const pending = state.data.remises.filter(r => r.status !== 'done').length;
    const user = activeUser();
    const header = embeddedMode()
      ? `<div class="row" style="justify-content:space-between"><strong>${I18N[locale].appTitle}</strong><button class="btn ghost" onclick="history.back()">Retour</button></div>`
      : `<div class="stack"><h1>${I18N[locale].appTitle}</h1><span class="small">DL.WMS Laval · Offline-first</span></div>`;

    const content = `
      <article class="card stack">
        <div class="row" style="justify-content:space-between"><strong>Utilisateur</strong><span>${user?.name || '-'}</span></div>
        <div class="row" style="justify-content:space-between"><strong>Remises en attente</strong><span class="badge pending">${pending}</span></div>
      </article>
      <article class="card grid-2">
        <button class="btn primary" data-go="#generate">Générer une remise</button>
        <button class="btn primary" data-go="#next">Prochaine remise</button>
        <button class="btn" data-go="#history">Historique</button>
        <button class="btn" data-go="#settings">Paramètres</button>
      </article>
      <article class="card row" style="gap:12px; justify-content:space-between;">
        <div class="row" style="gap:10px;">
          <img src="assets/icons/remise.svg" alt="Remise" width="48" height="48" />
          <div><strong>Tuile DL.WMS: Remise en stock</strong><p class="small">Prête pour routing vers /remise/</p></div>
        </div>
        <span class="badge pending">Module</span>
      </article>`;

    layout(header, content);
    $$('[data-go]').forEach(btn => btn.onclick = () => location.hash = btn.dataset.go);
  }

  function aggregateDraftItems() {
    const map = new Map();
    for (const e of state.currentDraft.items) {
      const current = map.get(e.sku) || { sku: e.sku, qty: 0, actions: [] };
      current.qty += 1;
      current.actions.push(...e.actions);
      map.set(e.sku, current);
    }
    return [...map.values()];
  }

  function renderGenerate() {
    state.currentDraft ||= { idTemp: `draft-${Date.now()}`, items: [] };
    const agg = aggregateDraftItems();
    const content = `
      <article class="card stack">
        <h2>Générer une remise</h2>
        <div class="row gap">
          <input id="scanInput" placeholder="Scanner ITEM" autocomplete="off" />
          <button id="scanBtn" class="btn primary">Valider</button>
        </div>
        <p class="small">1 scan = 1 pièce · Enter ou Valider</p>
      </article>
      <article class="card stack">
        <div class="row" style="justify-content:space-between"><h3>Liste en cours</h3><span>${agg.length} SKU</span></div>
        <div class="list">
          ${agg.map(i => `<button class="item-row" data-sku="${i.sku}"><strong>${i.sku}</strong> · Qty: ${i.qty}</button>`).join('') || '<p class="muted">Aucun scan</p>'}
        </div>
      </article>
      <button id="completeDraft" class="btn primary">Compléter remise</button>
    `;
    layout(`<h1>Génération</h1>`, content);

    $('#scanBtn').onclick = () => handleScanGenerate();
    $('#scanInput').onkeydown = (e) => e.key === 'Enter' && handleScanGenerate();
    $$('.item-row').forEach(el => el.onclick = () => openItemActions(el.dataset.sku));
    $('#completeDraft').onclick = completeDraft;
    focusScan();
  }

  async function handleScanGenerate() {
    const el = $('#scanInput'); if (!el) return;
    const sku = normalizeScan(el.value); el.value = '';
    if (!sku) return toast('Scan vide');
    if (!antiDouble(sku)) return;
    state.currentDraft.items.push({ sku, qty: 1, actions: [] });
    await store.save(); vibrate(); beep(); renderGenerate();
  }

  function openItemActions(sku) {
    const n = $('#tplActionPopover').content.firstElementChild.cloneNode(true);
    $('#actionSkuText', n).textContent = `SKU: ${sku}`;
    $$('[data-action]', n).forEach(btn => btn.onclick = async () => {
      const action = btn.dataset.action;
      if (action === 'cancel') return closeModal();
      if (action === 'delete') {
        const i = state.currentDraft.items.findIndex(x => x.sku === sku);
        if (i >= 0) state.currentDraft.items.splice(i, 1);
      }
      if (action === 'scrap') await runScrapFlow(sku);
      if (action === 'rebox') {
        const unit = state.currentDraft.items.find(x => x.sku === sku && !x.actions.some(a => a.type === 'rebox'));
        if (unit) unit.actions.push({ type: 'rebox', at: nowIso(), meta: {} });
      }
      await store.save(); closeModal(); renderGenerate();
    });
    openModal(n);
  }

  async function runScrapFlow(sku) {
    const item = await promptInput({ title: 'Scrap · scanner produit', desc: 'Confirmez le SKU', placeholder: sku, validate: v => normalizeScan(v) === sku });
    if (!item) return;
    const box = await promptInput({ title: 'Scrap · scanner bac', desc: 'Format Scrapbox1+', placeholder: 'SCRAPBOX1', validate: v => /^SCRAPBOX\d+$/i.test(v.trim()) });
    if (!box) return;
    const scrapBox = normalizeScan(box);
    const unit = state.currentDraft.items.find(x => x.sku === sku && !x.actions.some(a => a.type === 'scrap'));
    if (!unit) return;
    unit.actions.push({ type: 'scrap', at: nowIso(), meta: { scrapBox } });
    state.data.scrapLogs.push({ at: nowIso(), userId: activeUser().id, sku, basketOrRemiseId: state.currentDraft.idTemp, scrapBox, zone: '', bin: scrapBox, qty: 1 });
  }

  async function completeDraft() {
    if (!state.currentDraft?.items?.length) return toast('Aucun item scanné');
    const bid = await promptInput({
      title: 'Compléter remise',
      desc: 'Scanner panier/palette (LAVREMPxx)',
      placeholder: nextBasketId(),
      validate: v => /^LAVREMP\d{2}$/i.test(v.trim())
    });
    if (!bid) return;
    const basketId = normalizeScan(bid);
    if (!state.data.baskets.some(b => b.id === basketId)) state.data.baskets.push({ id: basketId, createdAt: nowIso(), notes: '' });

    const grouped = aggregateDraftItems().map(it => {
      const map = state.data.itemsMap[it.sku] || {};
      const scrapCount = it.actions.filter(a => a.type === 'scrap').length;
      const rebox = it.actions.some(a => a.type === 'rebox');
      return {
        sku: it.sku,
        shortDesc: map.shortDesc || '',
        zone: rebox ? 'Rebox' : (map.zone || ''),
        aisle: map.aisle || '',
        bin: map.bin || '',
        qtyTotal: it.qty,
        qtyRemaining: it.qty,
        rebox,
        scrapCount
      };
    }).sort(compareLoc);

    const remise = {
      id: nextRemiseId(), basketId, status: 'pending', createdAt: nowIso(), startedAt: null, doneAt: null,
      createdByUserId: activeUser().id, processedByUserId: null,
      lines: grouped,
      logs: [{ at: nowIso(), userId: activeUser().id, type: 'created', message: 'Remise générée', data: { basketId } }]
    };

    state.data.remises.push(remise);
    state.data.tasks.push({ at: nowIso(), type: 'archive_draft', draft: clone(state.currentDraft) });
    state.currentDraft = { idTemp: `draft-${Date.now()}`, items: [] };
    await store.save(); toast(`Remise ${remise.id} créée`); location.hash = '#next';
  }

  function renderNext() {
    const cards = state.data.remises.filter(r => r.status !== 'done').map(r => {
      const cls = r.status === 'pending' ? 'pending' : 'progress';
      return `<button class="item-row" data-remise="${r.id}">
        <div class="row" style="justify-content:space-between"><strong>${r.id}</strong><span class="badge ${cls}">${r.status}</span></div>
        <p class="small">${r.lines.length} lignes · Panier ${r.basketId}</p>
      </button>`;
    }).join('') || '<p class="muted">Aucune remise en attente.</p>';

    const content = `
      <article class="card stack">
        <h2>Prochaine remise</h2>
        <div class="row gap"><input id="scanInput" placeholder="Scanner ID remise (LAVREM0001)" /><button id="openRemiseBtn" class="btn primary">Ouvrir</button></div>
      </article>
      <article class="card stack"><h3>Liste</h3><div class="list">${cards}</div></article>`;

    layout('<h1>Prochaine remise</h1>', content);
    $('#openRemiseBtn').onclick = openRemiseByScan;
    $('#scanInput').onkeydown = e => e.key === 'Enter' && openRemiseByScan();
    $$('.item-row[data-remise]').forEach(el => el.onclick = () => openTreatment(el.dataset.remise));
    focusScan();
  }

  function openRemiseByScan() {
    const v = normalizeScan($('#scanInput').value || '');
    if (!/^LAVREM\d{4}$/.test(v)) return toast('Format remise invalide');
    openTreatment(v);
  }

  function currentRemise() { return state.data.remises.find(r => r.id === state.selectedRemiseId); }

  async function openTreatment(remiseId) {
    const rem = state.data.remises.find(r => r.id === remiseId);
    if (!rem) return toast('Remise introuvable');
    if (rem.status === 'pending') { rem.status = 'in_progress'; rem.startedAt = nowIso(); }
    state.selectedRemiseId = remiseId;
    state.treatIndex = rem.lines.findIndex(l => l.qtyRemaining > 0);
    if (state.treatIndex < 0) state.treatIndex = rem.lines.length;
    state.scanMode = 'item';
    await store.save(); location.hash = '#treatment';
  }

  function renderTreatment() {
    const rem = currentRemise();
    if (!rem) return location.hash = '#next';
    if (rem.lines.every(l => l.qtyRemaining <= 0)) return finishRemise(rem);
    const line = rem.lines[state.treatIndex] || rem.lines.find(l => l.qtyRemaining > 0);
    if (!line) return finishRemise(rem);
    const done = rem.lines.reduce((s, l) => s + (l.qtyTotal - l.qtyRemaining), 0);
    const total = rem.lines.reduce((s, l) => s + l.qtyTotal, 0);
    const pct = Math.round((done / total) * 100);

    const content = `
      <article class="card stack">
        <div class="row" style="justify-content:space-between"><strong>${rem.id}</strong><span class="badge progress">En cours</span></div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p class="small">${done}/${total} pièces</p>
      </article>
      <article class="card stack">
        <h3>${line.shortDesc || line.sku}</h3>
        <p>Zone <strong>${line.zone || '-'}</strong> · Allée <strong>${line.aisle || '-'}</strong> · Bin <strong>${line.bin || '-'}</strong></p>
        <p>Qty restante: <strong>${line.qtyRemaining}</strong> / ${line.qtyTotal}</p>
      </article>
      <article class="card stack">
        <div class="row gap"><input id="scanInput" placeholder="${state.scanMode === 'item' ? 'Scanner item' : 'Confirmer bin'}" /><button id="scanBtn" class="btn primary">Valider</button></div>
        <div class="row gap">
          <button id="undoBtn" class="btn ghost">Annuler / Retour arrière</button>
          <button id="manualBtn" class="btn icon-btn" title="Entrée manuelle">✍️</button>
          ${line.qtyRemaining > 1 ? '<button id="forceBtn" class="btn warning">Forcer</button>' : ''}
          <button id="whyBtn" class="btn">Pourquoi ?</button>
        </div>
      </article>`;

    layout('<h1>Traitement</h1>', content);
    $('#scanBtn').onclick = () => handleTreatmentScan(line);
    $('#scanInput').onkeydown = e => e.key === 'Enter' && handleTreatmentScan(line);
    $('#undoBtn').onclick = () => undoTreatment(rem);
    $('#manualBtn').onclick = () => manualEntry();
    $('#whyBtn').onclick = () => askWhy('bin_confirm');
    if ($('#forceBtn')) $('#forceBtn').onclick = () => forceLine(rem, line);
    focusScan();
  }

  async function handleTreatmentScan(line) {
    const rem = currentRemise(); if (!rem) return;
    const v = normalizeScan($('#scanInput').value || ''); $('#scanInput').value = '';
    if (!v || !antiDouble(v)) return;

    if (state.scanMode === 'item') {
      if (v !== line.sku) return toast('Mauvais item');
      line.qtyRemaining = Math.max(0, line.qtyRemaining - 1);
      rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'scan_item', message: `Scan ${line.sku}`, data: { qtyRemaining: line.qtyRemaining } });
      vibrate(); beep();
      if (line.qtyRemaining <= 0 || line.qtyRemaining === 1) {
        toast('Produit confirmé');
        if (state.data.settings.requireBinConfirm) state.scanMode = 'bin';
      }
    } else {
      if (v !== normalizeScan(line.bin || '')) return toast('Bin invalide');
      rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'scan_bin', message: `Bin ${line.bin} confirmé`, data: {} });
      toast('Remise complète');
      state.scanMode = 'item';
      state.treatIndex = rem.lines.findIndex(l => l.qtyRemaining > 0);
      if (state.treatIndex < 0) return finishRemise(rem);
    }
    await store.save(); renderTreatment();
  }

  async function forceLine(rem, line) {
    const reason = await promptInput({ title: 'Forcer la ligne', desc: 'Justification obligatoire', placeholder: 'Raison…', validate: v => v.trim().length > 2 });
    if (!reason) return;
    line.qtyRemaining = 0;
    rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'force', message: 'FORCED', data: { sku: line.sku, reason } });
    await store.save(); toast('Ligne forcée'); renderTreatment();
  }

  async function undoTreatment(rem) {
    const last = [...rem.logs].reverse().find(l => l.type === 'scan_item' || l.type === 'force');
    if (!last) return toast('Aucune action à annuler');
    const line = rem.lines.find(l => l.sku === (last.data?.sku || last.message.split(' ')[1]));
    if (!line) return;
    line.qtyRemaining = Math.min(line.qtyTotal, line.qtyRemaining + 1);
    rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'undo', message: 'Annulation étape', data: { sku: line.sku } });
    await store.save(); renderTreatment();
  }

  async function manualEntry() {
    const v = await promptInput({ title: 'Entrée manuelle', desc: 'Code item ou bin', validate: x => !!x.trim() });
    if (!v) return;
    $('#scanInput').value = normalizeScan(v);
    $('#scanBtn').click();
  }

  async function finishRemise(rem) {
    rem.status = 'done'; rem.doneAt = nowIso(); rem.processedByUserId = activeUser().id;
    rem.logs.push({ at: nowIso(), userId: activeUser().id, type: 'done', message: 'Remise terminée', data: {} });
    await store.save();
    layout('<h1>Fin de remise</h1>', `
      <article class="card stack">
        <h2>${rem.id} complétée ✅</h2>
        <button class="btn primary" data-go="#next">Prochaine remise</button>
        <button class="btn" data-go="#generate">Générer une remise</button>
      </article>`);
    $$('[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
  }

  function renderHistory() {
    const rows = state.data.remises.filter(r => r.status === 'done').map(r => `<button class="item-row" data-rid="${r.id}"><strong>${r.id}</strong><p class="small">${r.doneAt || ''}</p></button>`).join('') || '<p class="muted">Historique vide.</p>';
    layout('<h1>Historique</h1>', `
      <article class="card stack">
        <h3>Remises complétées</h3>
        <div class="list">${rows}</div>
      </article>
      <article class="card stack">
        <button id="exportJson" class="btn primary">Export JSON complet</button>
        <button id="exportRemises" class="btn">Export CSV remises</button>
        <button id="exportScrap" class="btn">Export CSV scrap log</button>
        <label class="btn ghost" for="importJson">Import JSON</label>
        <input id="importJson" type="file" accept="application/json" class="hidden" />
      </article>`);
    $('#exportJson').onclick = () => download('dlwms-remise-export.json', JSON.stringify(state.data, null, 2), 'application/json');
    $('#exportRemises').onclick = () => exportCsvRemises();
    $('#exportScrap').onclick = () => exportCsvScrap();
    $('#importJson').onchange = importJson;
  }

  function csvEscape(x) { return `"${String(x ?? '').replaceAll('"', '""')}"`; }
  function exportCsvRemises() {
    const lines = ['id,status,createdAt,doneAt,basketId,lines'];
    state.data.remises.forEach(r => lines.push([r.id,r.status,r.createdAt,r.doneAt||'',r.basketId,r.lines.length].map(csvEscape).join(',')));
    download('remises.csv', lines.join('\n'), 'text/csv');
  }
  function exportCsvScrap() {
    const lines = ['at,userId,sku,basketOrRemiseId,scrapBox,zone,bin,qty'];
    state.data.scrapLogs.forEach(r => lines.push([r.at,r.userId,r.sku,r.basketOrRemiseId,r.scrapBox,r.zone,r.bin,r.qty].map(csvEscape).join(',')));
    download('scrap-log.csv', lines.join('\n'), 'text/csv');
  }

  function download(name, text, type) {
    const b = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  async function importJson(e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const incoming = JSON.parse(await f.text());
      mergeData(incoming);
      await store.save(); toast('Import terminé');
    } catch { toast('Import JSON invalide'); }
  }

  function mergeData(incoming) {
    ['users','baskets','remises','actions','scrapLogs','tasks','kb_notes','ai_chat_history'].forEach(k => {
      const base = state.data[k] || []; const add = incoming[k] || [];
      const seen = new Set(base.map(x => JSON.stringify(x)));
      add.forEach(x => { const sig = JSON.stringify(x); if (!seen.has(sig)) base.push(x); });
      state.data[k] = base;
    });
    state.data.itemsMap = Object.assign({}, state.data.itemsMap, incoming.itemsMap || {});
    state.data.settings = Object.assign({}, state.data.settings, incoming.settings || {});
    if (incoming.nextIds) {
      state.data.nextIds.remise = Math.max(state.data.nextIds.remise, incoming.nextIds.remise || 1);
      state.data.nextIds.basket = Math.max(state.data.nextIds.basket, incoming.nextIds.basket || 1);
    }
  }

  function renderSettings() {
    const zoneTxt = state.data.settings.zoneOrder.join(',');
    const users = state.data.users.map(u => `<button class="item-row" data-user="${u.id}"><strong>${u.name}</strong> ${u.active ? '✅' : ''}</button>`).join('');
    const notes = state.data.kb_notes.map((n, i) => `<div class="item-row"><strong>${n.q}</strong><p class="small">${n.a}</p><button class="btn ghost" data-del-note="${i}">Supprimer</button></div>`).join('');
    layout('<h1>Paramètres</h1>', `
      <article class="card stack">
        <h3>Scanner</h3>
        <label>Anti double-scan (ms)<input id="debounceMs" type="number" value="${state.data.settings.scanDebounceMs}"/></label>
        <label><input id="requireBin" type="checkbox" ${state.data.settings.requireBinConfirm ? 'checked' : ''}/> Exiger confirmation bin</label>
        <label><input id="autoFocus" type="checkbox" ${state.data.settings.autoFocus ? 'checked' : ''}/> Auto-focus scan</label>
      </article>
      <article class="card stack">
        <h3>Zones (ordre custom)</h3>
        <input id="zoneOrder" value="${zoneTxt}" />
      </article>
      <article class="card stack"><h3>Utilisateurs</h3>${users}<button id="addUser" class="btn">Ajouter utilisateur</button></article>
      <article class="card stack">
        <h3>Import mapping CSV (SKU,shortDesc,zone,aisle,bin)</h3>
        <input id="csvMap" type="file" accept=".csv,text/csv" />
      </article>
      <article class="card stack"><h3>KB notes IA</h3>${notes || '<p class="small">Aucune note.</p>'}<button id="addKb" class="btn">Ajouter note Q/R</button></article>
      <article class="card stack">
        <h3>Debug</h3>
        <button id="seedBtn" class="btn">Générer données exemple</button>
        <button id="resetBtn" class="btn danger">Reset local</button>
      </article>`);

    $('#debounceMs').onchange = saveSettings;
    $('#requireBin').onchange = saveSettings;
    $('#autoFocus').onchange = saveSettings;
    $('#zoneOrder').onchange = saveSettings;
    $$('.item-row[data-user]').forEach(u => u.onclick = () => setActiveUser(u.dataset.user));
    $('#addUser').onclick = addUser;
    $('#csvMap').onchange = importCsvMap;
    $('#addKb').onclick = addKbNote;
    $$('[data-del-note]').forEach(b => b.onclick = async () => { state.data.kb_notes.splice(+b.dataset.delNote, 1); await store.save(); renderSettings(); });
    $('#seedBtn').onclick = async () => { seedDemo(); await store.save(); toast('Données exemple générées'); };
    $('#resetBtn').onclick = async () => { if (confirm('Tout effacer ?')) { state.data = clone(defaults); await store.save(); renderSettings(); } };
  }

  async function saveSettings() {
    state.data.settings.scanDebounceMs = Math.max(100, +$('#debounceMs').value || 300);
    state.data.settings.requireBinConfirm = $('#requireBin').checked;
    state.data.settings.autoFocus = $('#autoFocus').checked;
    state.data.settings.zoneOrder = $('#zoneOrder').value.split(',').map(x => x.trim()).filter(Boolean);
    await store.save(); toast('Paramètres sauvegardés');
  }

  async function setActiveUser(id) {
    state.data.users.forEach(u => u.active = u.id === id);
    await store.save(); renderSettings();
  }

  async function addUser() {
    const name = await promptInput({ title: 'Nouveau user', desc: 'Nom affiché', validate: v => v.trim().length > 1 });
    if (!name) return;
    state.data.users.push({ id: `u${Date.now()}`, name: name.trim(), active: false });
    await store.save(); renderSettings();
  }

  async function addKbNote() {
    const q = await promptInput({ title: 'KB note', desc: 'Question', validate: v => !!v.trim() });
    if (!q) return;
    const a = await promptInput({ title: 'KB note', desc: 'Réponse', validate: v => !!v.trim() });
    if (!a) return;
    state.data.kb_notes.push({ q, a, at: nowIso() });
    await store.save(); renderSettings();
  }

  async function importCsvMap(e) {
    const f = e.target.files[0]; if (!f) return;
    const rows = (await f.text()).split(/\r?\n/).filter(Boolean).map(r => r.split(','));
    const head = rows.shift().map(h => h.trim().toLowerCase());
    const idx = (k) => head.indexOf(k);
    rows.forEach(r => {
      const sku = normalizeScan(r[idx('sku')] || '');
      if (!sku) return;
      state.data.itemsMap[sku] = {
        shortDesc: (r[idx('shortdesc')] || '').trim(),
        zone: (r[idx('zone')] || '').trim(),
        aisle: (r[idx('aisle')] || '').trim(),
        bin: (r[idx('bin')] || '').trim()
      };
    });
    await store.save(); toast('Mapping importé');
  }

  function seedDemo() {
    const bid = nextBasketId();
    state.data.baskets.push({ id: bid, createdAt: nowIso(), notes: 'seed' });
    state.data.itemsMap.DEMO1 = { shortDesc: 'Produit demo', zone: 'A', aisle: 'A1', bin: 'B01' };
    state.data.remises.push({
      id: nextRemiseId(), basketId: bid, status: 'pending', createdAt: nowIso(), startedAt: null, doneAt: null,
      createdByUserId: activeUser().id, processedByUserId: null,
      lines: [{ sku: 'DEMO1', shortDesc: 'Produit demo', zone: 'A', aisle: 'A1', bin: 'B01', qtyTotal: 3, qtyRemaining: 3, rebox: false, scrapCount: 0 }],
      logs: []
    });
  }

  function askWhy(topic) {
    const dict = {
      force: 'Forcer exige une justification pour assurer traçabilité et audit.',
      sorting: 'Ordre Zone→Allée→Bin = parcours optimisé avec moins de déplacements.',
      bin_confirm: 'La confirmation bin garantit le bon emplacement produit.',
      rebox: 'Rebox en fin évite les retours en arrière.'
    };
    toast(dict[topic] || 'Décision basée sur règles internes.');
  }

  function normalizeText(txt = '') {
    return txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokenize(txt) { return normalizeText(txt).split(' ').filter(Boolean); }

  function normalizeSynonyms(tokens) {
    const map = {
      bac: 'bin', emplacement: 'bin', location: 'bin',
      panier: 'remise',
      rebut: 'scrap', briser: 'scrap',
      're-emballer': 'rebox', reemballer: 'rebox',
      lire: 'scanner', bip: 'scanner', scan: 'scanner'
    };
    return tokens.map(t => map[t] || t);
  }

  function detectIntent(tokens) {
    let best = { intent: 'AIDE_GENERALE', score: 0 };
    Object.entries(INTENTS).forEach(([intent, keys]) => {
      const score = keys.filter(k => tokens.includes(k)).length;
      if (score > best.score) best = { intent, score };
    });
    return best.intent;
  }

  function detectErrorRule(tokens, rawQuestion) {
    if (!rawQuestion.trim()) return { summary: 'Rien scanné, recommence.', sources: ['Règle erreur: scan vide'] };
    if (tokens.includes('forcer') && tokens.includes('sans') && !tokens.includes('justification')) return { summary: 'Forcer refusé: une justification est obligatoire.', sources: ['Règle erreur: forcer sans justification'] };
    if (tokens.includes('scrap') && tokens.includes('sans') && !tokens.some(t => t.startsWith('scrapbox'))) return { summary: 'Scrap refusé: scanne un code ScrapBox valide.', sources: ['Règle erreur: scrap sans ScrapBox'] };
    if (/lavrem|lavremp/.test(rawQuestion) && !/(^|\s)LAVREM\d{4}(\s|$)|(^|\s)LAVREMP\d{2}(\s|$)/i.test(rawQuestion) && tokens.some(t => t.includes('lavrem'))) {
      return { summary: 'Format invalide. Remise: ^LAVREM\\d{4}$ (ex LAVREM0007), Panier: ^LAVREMP\\d{2}$ (ex LAVREMP03).', sources: ['Validation: ^LAVREM\\d{4}$', 'Validation: ^LAVREMP\\d{2}$'] };
    }
    if (tokens.includes('double') && tokens.includes('scan')) return { summary: 'Double scan ignoré (anti double-scan).', sources: ['Règle erreur: anti double-scan'] };
    return null;
  }

  function formatAssistantAnswer({ summary, steps, why, where, sources }) {
    return [
      `<div><strong>Résumé</strong><br/>${summary}</div>`,
      `<div><strong>Étapes</strong><ul>${steps.map(s => `<li>${s}</li>`).join('')}</ul></div>`,
      `<div><strong>Pourquoi</strong><br/>${why}</div>`,
      `<div><strong>Où cliquer</strong><br/>${where}</div>`,
      `<div class="kb-source"><strong>Sources internes</strong>: ${(sources || ['Aucune']).join(' | ')}</div>`
    ].join('');
  }

  function findBestFaq(tokens) {
    let best = { score: 0, entry: null };
    [...state.data.kb_faq, ...state.data.kb_notes].forEach(entry => {
      const hay = normalizeSynonyms(tokenize(`${entry.q} ${entry.a} ${(entry.tags || []).join(' ')}`));
      const score = tokens.filter(t => hay.includes(t)).length;
      if (score > best.score) best = { score, entry };
    });
    return best.entry;
  }

  async function askAssistant() {
    const q = ($('#iaInput').value || '').trim();
    if (!q) return toast('Rien scanné, recommence');
    $('#iaInput').value = '';
    const tokens = normalizeSynonyms(tokenize(q));
    const intent = detectIntent(tokens);
    const error = detectErrorRule(tokens, q);
    const entry = findBestFaq(tokens);

    const explainers = {
      FORCER: 'Traçabilité + audit + réduction des pertes inventaire.',
      CONFIRMER_BIN: 'Assure la remise au bon emplacement.',
      PARAMETRES: 'Les réglages stabilisent le processus de scan.',
      ACTION_ITEM: 'Chaque action item conserve un log clair.',
      GENERER_REMISE: 'Le scan unitaire garantit une remise exacte.',
      TRAITEMENT_REMISE: 'Le flux guidé réduit les erreurs opérationnelles.',
      REBOX_PROC: 'Rebox en fin optimise le parcours.',
      SCRAP_PROC: 'Le Scrap exige preuve de traitement (ScrapBox).'
    };

    const response = error ? {
      summary: error.summary,
      steps: ['Revoir le format ou l’étape demandée.', 'Resscanner avec un code valide.'],
      why: explainers[intent] || 'Le moteur applique les règles de contrôle qualité offline.',
      where: 'Écran courant + champs de scan (ou Paramètres > KB).',
      sources: error.sources
    } : {
      summary: entry?.a || 'Je n’ai pas trouvé de réponse exacte. Consulte Paramètres > KB pour enrichir la base locale.',
      steps: ['Suivre le flux à l’écran.', 'Valider chaque scan demandé.', 'En cas d’exception, utiliser Forcer avec justification.'],
      why: explainers[intent] || 'Le moteur applique les règles de contrôle qualité offline.',
      where: intent === 'GENERER_REMISE' ? 'Accueil > Générer une remise > Compléter remise' :
        intent === 'TRAITEMENT_REMISE' ? 'Accueil > Prochaine remise > Traitement' :
          intent === 'EXPORT_IMPORT' ? 'Historique / Paramètres' : 'Paramètres > KB',
      sources: entry?.sources || [`Intent: ${intent}`, ...(entry?.q ? [`FAQ/KB: ${entry.q}`] : [])]
    };

    const c = document.createElement('div');
    c.className = 'ia-msg';
    c.innerHTML = `<strong>Q:</strong> ${q}${formatAssistantAnswer(response)}<button class="btn ghost" data-why="1">Pourquoi ?</button>`;
    c.querySelector('[data-why]').onclick = () => askWhy(intent === 'FORCER' ? 'force' : (intent === 'CONFIRMER_BIN' ? 'bin_confirm' : (intent === 'REBOX_PROC' ? 'rebox' : 'sorting')));
    $('#iaMessages').prepend(c);
    state.data.ai_chat_history.unshift({ at: nowIso(), q, intent, response });
    state.data.ai_chat_history = state.data.ai_chat_history.slice(0, 300);
    await store.save();
  }

  function wireIA() {
    $('#iaToggle').onclick = () => {
      const b = $('#iaBody'); b.classList.toggle('hidden');
      $('#iaToggle').setAttribute('aria-expanded', String(!b.classList.contains('hidden')));
    };
    $('#iaAskBtn').onclick = askAssistant;
    $('#iaInput').onkeydown = e => e.key === 'Enter' && askAssistant();
  }

  function wireScanInput() {
    const i = $('#scanInput'); if (!i) return;
    if (state.data?.settings?.autoFocus !== false) setTimeout(() => i.focus(), 40);
  }
  function focusScan() { if (state.data?.settings?.autoFocus !== false) setTimeout(() => $('#scanInput')?.focus(), 40); }

  function render() {
    const route = location.hash || '#home';
    state.route = route;
    if (route === '#home') return renderHome();
    if (route === '#generate') return renderGenerate();
    if (route === '#next') return renderNext();
    if (route === '#treatment') return renderTreatment();
    if (route === '#history') return renderHistory();
    if (route === '#settings') return renderSettings();
    location.hash = '#home';
  }

  async function init() {
    await store.init();
    wireIA();
    $('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeModal(); });
    window.addEventListener('hashchange', render);
    render();
  }

  init();
})();
