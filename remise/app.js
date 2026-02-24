(() => {
  const I18N = {
    fr: {
      appTitle: 'Remise en stock',
      home: 'Accueil',
    },
    en: { appTitle: 'Putaway', home: 'Home' }
  };
  const locale = 'fr';

  const KB_FAQ_FIXED = [
  { id: 1,
    q: "C’est quoi le but de la page Remise en stock ?",
    a: "Créer une remise (liste d’items scannés, 1 scan = 1 pièce) puis la traiter avec validation (scan item puis scan bin) pour remettre au bon emplacement, en gardant un historique complet (logs).",
    tags: ["but","workflow","remise","offline"],
    sources: ["Règle: génération 1 scan=1 pièce","Règle: traitement item->bin","Règle: logs/historique"]
  },
  { id: 2,
    q: "Comment je génère une nouvelle remise ?",
    a: "Accueil > Générer une remise. Scanne chaque item (1 scan ajoute 1 pièce). Quand terminé, appuie sur 'Compléter remise' et scanne le panier (LAVREMPxx) si demandé.",
    tags: ["générer","nouvelle","scan"],
    sources: ["Écran: Générer une remise","Règle: 1 scan=1 pièce","Règle: Compléter -> archive+optimise"]
  },
  { id: 3,
    q: "Pourquoi 1 scan = 1 pièce ?",
    a: "Parce que chaque scan représente une unité réelle: précision maximale, moins d’erreurs, inventaire plus fiable.",
    tags: ["règle","scan","quantité","pourquoi"],
    sources: ["Règle: scan item (1 scan=1 pièce)"]
  },
  { id: 4,
    q: "Je peux entrer une quantité au lieu de scanner ?",
    a: "En exception seulement. L’entrée manuelle est cachée derrière l’icône ✍️ et sert quand le scan est impossible. Le flux privilégie le scan pour limiter les erreurs.",
    tags: ["manuel","quantité","exception"],
    sources: ["Règle: entrée manuelle cachée","Règle: scan prioritaire"]
  },
  { id: 5,
    q: "Comment je supprime un item pendant la génération ?",
    a: "Tape sur l’item dans la liste > 'Supprimer'. La quantité est ajustée en conséquence.",
    tags: ["supprimer","génération","liste"],
    sources: ["Règle: tap item -> popup actions (Supprimer)"]
  },
  { id: 6,
    q: "Comment je diminue la quantité d’un item en génération ?",
    a: "Tape sur l’item. Si l’app propose 'Retirer 1' ou 'Supprimer', utilise 'Retirer 1' (sinon supprime puis rescane la bonne quantité).",
    tags: ["quantité","génération","corriger"],
    sources: ["Règle: tap item -> actions","UX: corrections via actions"]
  },
  { id: 7,
    q: "C’est quoi 'Briser' ?",
    a: "Briser envoie l’unité au flux Scrap (rebut). L’app exige ensuite un scan item + un scan ScrapBox, et loggue date/heure/utilisateur/zone/bin.",
    tags: ["briser","scrap","rebut"],
    sources: ["Règle: Briser -> Scrap + scans obligatoires + log"]
  },
  { id: 8,
    q: "C’est quoi 'Rebox' ?",
    a: "Rebox marque l’unité pour ré-emballage. Elle doit être traitée dans une zone Rebox dédiée, généralement en fin de parcours.",
    tags: ["rebox","emballage","zone"],
    sources: ["Règle: Rebox -> zone fin de parcours"]
  },
  { id: 9,
    q: "Pourquoi Rebox est à la fin ?",
    a: "Pour optimiser les déplacements: on évite les retours en arrière et on termine par la zone de ré-emballage.",
    tags: ["rebox","optimisation","pourquoi"],
    sources: ["Règle: Rebox en fin de parcours","Règle: tri/chemin optimisé"]
  },
  { id: 10,
    q: "C’est quoi 'Compléter remise' ?",
    a: "Ça clôture la génération, archive le brouillon, crée un ID LAVREMxxxx et trie la liste finale selon Zone→Allée→Bin. Ensuite la remise apparaît dans 'Prochaine remise'.",
    tags: ["compléter","archive","tri"],
    sources: ["Règle: Compléter -> archive+optimise -> Prochaine remise"]
  },
  { id: 11,
    q: "Quel est le format ID d’une remise ?",
    a: "LAVREM0001 (sans tirets).",
    tags: ["format","id","lavrem"],
    sources: ["Règle: ID remise = LAVREM0001"]
  },
  { id: 12,
    q: "Quel est le format ID d’un panier ?",
    a: "LAVREMP01 (sans tirets).",
    tags: ["format","id","lavremp"],
    sources: ["Règle: panier = LAVREMP01"]
  },
  { id: 13,
    q: "Que faire si je scanne un ID invalide ?",
    a: "Vérifie le format: remise = LAVREM + 4 chiffres; panier = LAVREMP + 2 chiffres. Exemple: LAVREM0007 et LAVREMP03.",
    tags: ["erreur","format","validation"],
    sources: ["Validation: ^LAVREM\d{4}$","Validation: ^LAVREMP\d{2}$"]
  },
  { id: 14,
    q: "Comment traiter une remise ?",
    a: "Accueil > Prochaine remise. Sélectionne ou scanne LAVREMxxxx. L’écran Traitement te guide produit par produit.",
    tags: ["traiter","prochaine","workflow"],
    sources: ["Écran: Prochaine remise","Écran: Traitement"]
  },
  { id: 15,
    q: "Pourquoi je dois scanner le bin (emplacement) ?",
    a: "Pour confirmer que le produit est remis au bon emplacement: c’est un contrôle qualité qui réduit les pertes et erreurs d’inventaire.",
    tags: ["bin","validation","qualité","pourquoi"],
    sources: ["Règle: confirmation bin","Pourquoi?: contrôle qualité"]
  },
  { id: 16,
    q: "Quand je vois le popup 'Produit confirmé' ?",
    a: "Quand la quantité restante atteint 1 et que tu scannes l’item: l’app confirme et passe ensuite en mode 'confirmer bin'.",
    tags: ["popup","qty","confirm"],
    sources: ["Règle: qty=1 -> popup produit confirmé -> confirmer bin"]
  },
  { id: 17,
    q: "Quand je vois le popup 'Remise complète' ?",
    a: "Après avoir scanné le bon bin en mode 'confirmer bin'. L’app termine la ligne et passe automatiquement au prochain item.",
    tags: ["popup","bin","terminer"],
    sources: ["Règle: scan bin -> popup remise complète -> next"]
  },
  { id: 18,
    q: "Je me suis trompé: je peux revenir en arrière ?",
    a: "Oui. Utilise 'Retour' / 'Annuler' pour annuler la dernière étape. L’app doit restaurer la quantité restante et le mode (item/bin).",
    tags: ["annuler","undo","erreur"],
    sources: ["Règle: toujours offrir Annuler/Retour arrière"]
  },
  { id: 19,
    q: "C’est quoi l’option 'Forcer' ?",
    a: "Forcer complète une ligne sans scanner toutes les pièces (exception). Une justification est obligatoire et l’action est loggée avec le tag FORCED.",
    tags: ["forcer","override","justification"],
    sources: ["Règle: Forcer avec justification obligatoire + log"]
  },
  { id: 20,
    q: "Pourquoi Forcer exige une justification ?",
    a: "Traçabilité et audit: on doit justifier pourquoi le scan complet n’a pas été fait (contrôle qualité, réduction pertes).",
    tags: ["forcer","pourquoi","audit"],
    sources: ["Pourquoi?: Forcer = traçabilité+audit"]
  },
  { id: 21,
    q: "Je peux forcer quand il reste 1 unité ?",
    a: "Normalement non: à 1 unité, le flux standard est item puis bin. Forcer sert surtout quand plusieurs unités restent et qu’on ne peut pas tout scanner.",
    tags: ["forcer","qty","règle"],
    sources: ["Règle: Forcer surtout si qty restante > 1"]
  },
  { id: 22,
    q: "Le scan ne rentre pas: quoi faire ?",
    a: "Assure-toi que le champ scan est focus. Ferme les modales. Si impossible, utilise ✍️ (entrée manuelle) en dernier recours.",
    tags: ["scan","dépannage","focus"],
    sources: ["Règle: focus scan permanent","Règle: entrée manuelle cachée"]
  },
  { id: 23,
    q: "Pourquoi l’app ignore un scan répété ?",
    a: "Anti double-scan: si le même code arrive trop vite (ex 300 ms), l’app ignore le doublon pour éviter les erreurs.",
    tags: ["double-scan","debounce","pourquoi"],
    sources: ["Règle: anti double scan (ignore même valeur 300ms)"]
  },
  { id: 24,
    q: "Comment l’ordre des produits est calculé ?",
    a: "La liste finale est triée par Zone→Allée→Bin (alphanum avec parsing), avec un ordre de zones configurable dans Paramètres.",
    tags: ["tri","ordre","zone","allée"],
    sources: ["Règle: tri Zone→Allée→Bin","Paramètres: zoneOrder"]
  },
  { id: 25,
    q: "Je veux changer l’ordre des zones: où ?",
    a: "Paramètres > Ordre des zones. Réordonne la liste (drag&drop) puis sauvegarde.",
    tags: ["zones","paramètres","ordre"],
    sources: ["Paramètres: zoneOrder editable + drag&drop"]
  },
  { id: 26,
    q: "Est-ce que ça fonctionne sans internet ?",
    a: "Oui. Données en local (IndexedDB/LocalStorage) + IA locale (FAQ + KB notes). Aucune dépendance réseau.",
    tags: ["offline","internet","stockage","ia"],
    sources: ["Règle: offline-first","Règle: IA offline KB"]
  },
  { id: 27,
    q: "Comment je change d’utilisateur ?",
    a: "Paramètres > Utilisateurs. Choisis l’utilisateur actif. Les logs utilisent cet utilisateur.",
    tags: ["utilisateur","logs","paramètres"],
    sources: ["Règle: users persistés + user actif appliqué aux logs"]
  },
  { id: 28,
    q: "Où voir l’historique des remises ?",
    a: "Accueil > Historique. Ouvre une remise pour voir lignes, temps, user et logs.",
    tags: ["historique","logs","remises"],
    sources: ["Écran: Historique"]
  },
  { id: 29,
    q: "Je peux exporter mes données ?",
    a: "Oui. Export JSON complet + export CSV (Remises, Scrap log).",
    tags: ["export","json","csv"],
    sources: ["Règle: export JSON","Règle: export CSV"]
  },
  { id: 30,
    q: "Je peux importer des données ?",
    a: "Oui. Import JSON avec merge + dédoublonnage. Utile pour transférer entre appareils.",
    tags: ["import","merge","dédoublonnage"],
    sources: ["Règle: import JSON merge + dédoublonnage"]
  },
  { id: 31,
    q: "Comment gérer Scrap exactement ?",
    a: "Pendant génération: tap item > Briser. Ensuite l’app exige scan item + scan ScrapBox. Elle loggue date/heure/user/zone/bin/bac.",
    tags: ["scrap","briser","scrapbox"],
    sources: ["Règle: Briser -> scans obligatoires + log"]
  },
  { id: 32,
    q: "C’est quoi un ScrapBox valide ?",
    a: "Ex: Scrapbox1, Scrapbox2… L’app normalise en SCRAPBOX# et refuse si vide/invalide.",
    tags: ["scrapbox","validation","format"],
    sources: ["Validation ScrapBox: ^SCRAPBOX\d+$ (normalisation)"]
  },
  { id: 33,
    q: "Si je n’ai pas de mapping (zone/allée/bin), ça marche ?",
    a: "Oui. Le traitement marche, mais la navigation est moins guidée. Tu peux importer un CSV mapping plus tard.",
    tags: ["mapping","optionnel","zone"],
    sources: ["Règle: mapping optionnel, app fonctionne sans"]
  },
  { id: 34,
    q: "C’est quoi le mapping CSV importé ?",
    a: "Un CSV item -> desc courte + zone + allée + bin. Il sert à pré-remplir les infos et à trier correctement.",
    tags: ["csv","mapping","import"],
    sources: ["Import: CSV mapping items -> desc/zone/aisle/bin"]
  },
  { id: 35,
    q: "Fin de remise: quoi faire ?",
    a: "L’app propose: 'Prochaine remise' (prendre une autre) ou 'Générer une remise' (en créer une nouvelle).",
    tags: ["fin","prochaine","générer"],
    sources: ["Règle: fin => Prochaine remise ou Générer"]
  },
  { id: 36,
    q: "Pourquoi revenir près de la zone Remise à la fin ?",
    a: "Le flux est conçu pour finir proche de la zone Remise afin d’enchaîner sans déplacements inutiles.",
    tags: ["fin","zone remise","organisation"],
    sources: ["Règle: opérateur doit revenir proche zone remise"]
  },
  { id: 37,
    q: "Le bouton 'Compléter remise' est grisé, pourquoi ?",
    a: "Souvent parce que la liste est vide ou qu’une action obligatoire est incomplète (ex Scrap en attente sans ScrapBox). Complète les scans requis.",
    tags: ["compléter","grisé","scrap"],
    sources: ["Règle: scans obligatoires Scrap","Règle: complétion nécessite état valide"]
  },
  { id: 38,
    q: "Je vois 'format invalide': quoi vérifier ?",
    a: "Assure-toi de scanner le bon type d’ID: remise LAVREMxxxx ou panier LAVREMPxx. Vérifie les zéros et la longueur.",
    tags: ["format","invalide","id"],
    sources: ["Validation ID remise/panier"]
  },
  { id: 39,
    q: "Différence entre pending / in_progress / done ?",
    a: "Pending = créée pas commencée. In_progress = traitement démarré. Done = terminée. Visible sur les cartes.",
    tags: ["statut","pending","done","progress"],
    sources: ["Règle: status pending|in_progress|done"]
  },
  { id: 40,
    q: "Comment l’IA répond offline ?",
    a: "Elle cherche dans la FAQ fixe + tes notes KB éditables + règles internes. Elle affiche aussi les sources internes utilisées.",
    tags: ["ia","offline","kb"],
    sources: ["Règle: IA KB offline (FAQ + notes + règles)"]
  },

  { id: 41,
    q: "Je peux ajouter mes propres réponses IA ?",
    a: "Oui. Paramètres > KB. Ajoute des notes ou des Q/R personnalisées. Elles sont sauvegardées et exportables.",
    tags: ["ia","kb","personnaliser"],
    sources: ["Règle: KB notes éditables persistées + export/import"]
  },
  { id: 42,
    q: "C’est quoi le bouton 'Pourquoi ?' ?",
    a: "Il explique une décision de l’app (ex: pourquoi justification en Forcer, pourquoi tri Zone→Allée→Bin, pourquoi confirmer bin).",
    tags: ["pourquoi","explication","ia"],
    sources: ["Règle: bouton Pourquoi? sur actions clés"]
  },
  { id: 43,
    q: "Pourquoi confirmer bin est activé par défaut ?",
    a: "Pour garantir que l’emplacement est correct et éviter les erreurs d’inventaire. Tu peux le désactiver dans Paramètres si autorisé.",
    tags: ["bin","paramètres","qualité"],
    sources: ["Règle: requireBinConfirm ON par défaut"]
  },
  { id: 44,
    q: "Où activer/désactiver confirmation bin ?",
    a: "Paramètres > 'Exiger confirmation bin'.",
    tags: ["bin","toggle","paramètres"],
    sources: ["Settings: requireBinConfirm"]
  },
  { id: 45,
    q: "Comment gérer un item inconnu (pas dans mapping) ?",
    a: "Continue le flux: l’item peut être traité sans description/zone. Ajoute-le ensuite au mapping CSV pour améliorer la guidance.",
    tags: ["inconnu","mapping","amélioration"],
    sources: ["Règle: app fonctionne sans mapping"]
  },
  { id: 46,
    q: "Si je scanne un bin différent de celui attendu, que se passe-t-il ?",
    a: "L’app doit afficher une erreur claire et refuser la complétion. Tu peux rescanner le bon bin ou revenir en arrière.",
    tags: ["bin","erreur","validation"],
    sources: ["Règle: validation bin en mode confirmer bin","Règle: Annuler/Retour"]
  },
  { id: 47,
    q: "Si je scanne le mauvais item en traitement, que se passe-t-il ?",
    a: "L’app refuse et te rappelle l’item attendu. Tu peux rescanner le bon item ou utiliser Retour si tu as fait une erreur précédente.",
    tags: ["item","erreur","traitement"],
    sources: ["Règle: scan item doit matcher l’item attendu"]
  },
  { id: 48,
    q: "Le champ scan doit rester focus, c’est normal ?",
    a: "Oui. Le workflow est pensé pour les scanners. L’app remet automatiquement le focus sur le champ scan après chaque action.",
    tags: ["focus","scan","ux"],
    sources: ["Règle: champ scan focus permanent"]
  },
  { id: 49,
    q: "Je peux désactiver l’anti double-scan ?",
    a: "Oui si l’app offre le paramètre. Sinon ajuste le délai (ms) dans Paramètres (ex: 300ms).",
    tags: ["double-scan","paramètres","debounce"],
    sources: ["Settings: scanDebounceMs"]
  },
  { id: 50,
    q: "Pourquoi il y a un délai anti double-scan ?",
    a: "Pour éviter les doublons causés par un scanner qui envoie deux fois la même valeur ou un appui double.",
    tags: ["double-scan","pourquoi","qualité"],
    sources: ["Règle: anti double scan"]
  },

  { id: 51,
    q: "Comment créer automatiquement LAVREM0001, LAVREM0002… ?",
    a: "L’app garde un compteur local et génère le prochain ID. Le compteur augmente à chaque remise créée.",
    tags: ["id","auto","compteur"],
    sources: ["Règle: générateur ID auto-incrément LAVREMxxxx"]
  },
  { id: 52,
    q: "Que faire si deux appareils créent le même ID ?",
    a: "En offline, c’est possible. À l’import, l’app doit détecter le conflit et proposer soit renommer, soit fusionner selon règles.",
    tags: ["conflit","import","id"],
    sources: ["Règle: import merge + dédoublonnage (doit gérer conflits)"]
  },
  { id: 53,
    q: "Comment l’app archive une remise ?",
    a: "Elle enregistre la remise et ses logs en local, change le statut (done) et conserve les timestamps (created/started/done).",
    tags: ["archive","logs","timestamps"],
    sources: ["Schéma: Remise {createdAt, startedAt, doneAt, logs}"]
  },
  { id: 54,
    q: "Quels logs sont importants ?",
    a: "Création, début traitement, chaque scan validé, chaque erreur majeure, chaque Forcer (avec justification), chaque Scrap/Rebox, fin de remise.",
    tags: ["logs","audit","traçabilité"],
    sources: ["Règle: historique/log moves + actions scrap/rebox + forced"]
  },
  { id: 55,
    q: "Où je vois les logs détaillés ?",
    a: "Historique > ouvrir une remise > section Logs.",
    tags: ["logs","historique","détails"],
    sources: ["Écran: Historique (détails)"]
  },
  { id: 56,
    q: "Je peux exporter le Scrap log séparément ?",
    a: "Oui. Export CSV 'Scrap log' (date/heure/user/item/scrapbox/zone/bin).",
    tags: ["scrap","export","csv"],
    sources: ["Règle: export CSV ScrapLog"]
  },
  { id: 57,
    q: "Rebox doit apparaître où dans la liste finale ?",
    a: "À la fin, dans la zone Rebox, pour éviter les détours pendant le parcours principal.",
    tags: ["rebox","ordre","fin"],
    sources: ["Règle: Rebox en fin de parcours"]
  },
  { id: 58,
    q: "Si je marque Rebox par erreur, je peux annuler ?",
    a: "Oui. Dans la popup actions de l’item (ou dans un écran de revue), retire le tag Rebox avant de compléter la remise.",
    tags: ["rebox","annuler","erreur"],
    sources: ["Règle: actions accessibles via tap item + undo"]
  },
  { id: 59,
    q: "Si je marque Briser par erreur, je peux annuler ?",
    a: "Avant d’avoir complété les scans obligatoires Scrap, tu peux annuler l’action depuis l’item. Si déjà loggué, un log de correction doit être ajouté.",
    tags: ["scrap","annuler","correction"],
    sources: ["Règle: Scrap exige scans; corrections doivent être traçables"]
  },
  { id: 60,
    q: "Quel est le minimum de scans pour une action Scrap ?",
    a: "Deux scans: item + ScrapBox. Sans ça, l’action est incomplète et ne doit pas être finalisée.",
    tags: ["scrap","scans","obligatoire"],
    sources: ["Règle: Briser -> scan item + scan ScrapBox obligatoires"]
  },

  { id: 61,
    q: "Pourquoi l’app demande parfois de rescanner l’item en Scrap ?",
    a: "Parce que la traçabilité Scrap est 1 unité à la fois et doit lier l’unité au log avec certitude.",
    tags: ["scrap","pourquoi","traçabilité"],
    sources: ["Règle: Scrap = scan item + scan ScrapBox + log complet"]
  },
  { id: 62,
    q: "Comment gérer un bin 'reçu' scanné avec des caractères bizarres ?",
    a: "L’app doit normaliser (trim, uppercase) et accepter un format flexible tant qu’il correspond à la logique interne (bin). Sinon afficher une erreur claire.",
    tags: ["bin","normalisation","scan"],
    sources: ["Règle: nettoyer espaces + uppercase si besoin"]
  },
  { id: 63,
    q: "Pourquoi certains boutons sont gros ?",
    a: "Parce que l’UI est iPhone-first: cibles tactiles larges, meilleure vitesse et moins d’erreurs de tap.",
    tags: ["ui","iphone","accessibilité"],
    sources: ["Règle: iPhone-first, gros boutons"]
  },
  { id: 64,
    q: "Pourquoi l’app utilise IndexedDB plutôt que juste LocalStorage ?",
    a: "IndexedDB est plus robuste pour beaucoup de données (historique, logs) et évite des limites de taille. LocalStorage sert de fallback.",
    tags: ["stockage","indexeddb","localstorage"],
    sources: ["Règle: store IndexedDB + fallback LocalStorage"]
  },
  { id: 65,
    q: "Que faire si le navigateur bloque IndexedDB ?",
    a: "L’app bascule sur LocalStorage automatiquement. Les fonctions essentielles restent disponibles.",
    tags: ["indexeddb","fallback","offline"],
    sources: ["Règle: fallback LocalStorage"]
  },
  { id: 66,
    q: "Je peux réinitialiser toutes les données ?",
    a: "Oui via Paramètres > Debug > Reset local (si activé). Attention: ça supprime l’historique.",
    tags: ["reset","debug","données"],
    sources: ["Règle: section Debug (dev only) reset local"]
  },
  { id: 67,
    q: "Pourquoi il y a un mode Debug ?",
    a: "Pour tests rapides: générer données d’exemple, simuler scans, vérifier le flux sans dépendre d’opérations réelles.",
    tags: ["debug","test","simulation"],
    sources: ["Règle: tests rapides intégrés (dev only)"]
  },
  { id: 68,
    q: "Est-ce que je peux ouvrir l’app juste avec index.html ?",
    a: "Oui. L’objectif est que ça fonctionne offline en ouvrant le fichier localement. Certaines fonctions de téléchargement peuvent dépendre du navigateur.",
    tags: ["index.html","offline","local"],
    sources: ["Règle: fonctionner en ouvrant index.html si possible"]
  },
  { id: 69,
    q: "Pourquoi certaines fonctions d’export peuvent ne pas marcher en fichier local ?",
    a: "Certains navigateurs limitent les téléchargements ou l’accès fichier en mode file://. Un serveur local simple peut aider, mais l’app doit rester usable.",
    tags: ["export","browser","limitations"],
    sources: ["Note: contraintes navigateur (file://)"]
  },
  { id: 70,
    q: "Comment importer le mapping depuis Excel ?",
    a: "Exporte depuis Excel en CSV UTF-8, puis importe ce CSV dans Paramètres > Import mapping. Le mapping remplit desc/zone/allée/bin.",
    tags: ["excel","csv","mapping"],
    sources: ["Règle: V1 import CSV mapping; doc exporter Excel->CSV"]
  },

  { id: 71,
    q: "Pourquoi pas importer .xlsx directement ?",
    a: "Sans librairie externe, lire .xlsx est lourd. V1 privilégie CSV. (Une V2 pourrait ajouter lecture xlsx si on autorise une lib locale).",
    tags: ["xlsx","csv","pourquoi"],
    sources: ["Règle: pas de dépendances externes; V1 CSV"]
  },
  { id: 72,
    q: "Je veux une description courte pour chaque item, comment l’obtenir ?",
    a: "Importe un mapping CSV item->shortDesc. Sinon, tu peux laisser vide ou saisir manuellement en mode admin si l’app l’offre.",
    tags: ["description","shortdesc","mapping"],
    sources: ["Schéma: shortDesc optionnel; mapping CSV"]
  },
  { id: 73,
    q: "Comment l’app choisit le prochain produit en traitement ?",
    a: "Elle suit l’ordre trié Zone→Allée→Bin. Quand une ligne est complétée (bin confirmé), elle passe automatiquement à la suivante.",
    tags: ["next","ordre","traitement"],
    sources: ["Règle: tri + next automatique"]
  },
  { id: 74,
    q: "Je peux traiter une remise partiellement et reprendre plus tard ?",
    a: "Oui. Statut in_progress et sauvegarde locale. Reviens dans Prochaine remise et rouvre la remise.",
    tags: ["reprendre","pause","in_progress"],
    sources: ["Règle: status in_progress + persistance offline"]
  },
  { id: 75,
    q: "Que faire si l’app se ferme en plein traitement ?",
    a: "Rouvre l’app: la remise reste sauvegardée. Retourne à Prochaine remise et reprends où tu étais.",
    tags: ["crash","reprise","sauvegarde"],
    sources: ["Règle: persistance IndexedDB/LocalStorage"]
  },
  { id: 76,
    q: "Comment gérer plusieurs opérateurs sur le même appareil ?",
    a: "Crée plusieurs utilisateurs dans Paramètres. Choisis l’utilisateur actif avant de commencer une remise. Les logs gardent l’info user.",
    tags: ["multi-user","opérateur","logs"],
    sources: ["Règle: users + user actif appliqué aux logs"]
  },
  { id: 77,
    q: "Pourquoi l’app affiche une barre de progression ?",
    a: "Pour visualiser l’avancement de la remise (lignes restantes, qty restantes) et garder le rythme en opération.",
    tags: ["progress","ui","avancement"],
    sources: ["UX: progress bar pour traitement"]
  },
  { id: 78,
    q: "Je veux savoir où cliquer rapidement pour chaque tâche, l’IA peut aider ?",
    a: "Oui. L’IA répond avec 'Où cliquer' (nom exact des boutons/écrans) pour guider rapidement sans formation longue.",
    tags: ["ia","où cliquer","guidage"],
    sources: ["Règle: format réponse IA inclut Où cliquer"]
  },
  { id: 79,
    q: "Comment l’app s’intègre à DL.WMS (tuile existante) ?",
    a: "La tuile existante 'Remise' doit router vers /remise/index.html (ou #/remise). L’icône doit être remise.svg et le menu bas doit aussi inclure 'Remise'.",
    tags: ["intégration","dlwms","tuile","menu bas"],
    sources: ["Règle: intégrer à la case Remise existante + bottom nav"]
  },
  { id: 80,
    q: "Qu’est-ce qui doit toujours rester offline et sans API ?",
    a: "Tout: génération, traitement, historique, exports/imports, et IA (FAQ+KB). Aucune requête réseau, aucune dépendance externe.",
    tags: ["offline","api","sécurité","exigence"],
    sources: ["Règle: offline-first, aucune API, aucune lib externe"]
  }
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
    kb_faq: KB_FAQ_FIXED,
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
      if (!Array.isArray(state.data.kb_faq) || state.data.kb_faq.length < 80) state.data.kb_faq = clone(KB_FAQ_FIXED);
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
