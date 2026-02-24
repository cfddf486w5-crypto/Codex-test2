# Module FAQ Réception

## Clés localStorage
- `DLWMS_RECEPTION_FAQ_V1`: dataset FAQ officiel + overrides importés.
- `DLWMS_RECEPTION_FAQ_NOTES_V1`: notes éditables de l’équipe.
- `DLWMS_RECEPTION_FAQ_PREFS_V1`: filtres actifs, recherche, accordéons, checklist.

## Structure dataset
```json
{
  "version": 1,
  "entries": [
    {
      "id": "stable-id",
      "category": "Démarrage / Objectif",
      "question": "...",
      "answer": "...",
      "keywords": ["mot-clé"],
      "severity": "info|warn|critical"
    }
  ]
}
```

## Ajouter de nouvelles Q/R
1. Ajouter une entrée dans `DEFAULT_FAQ` (`app/reception-faq.js`) avec un `id` stable.
2. Inclure des `keywords` orientés terrain (quai, bin, mapping, dommages, etc.).
3. Garder une réponse courte et actionnable mobile.
4. Recharger la page FAQ; si besoin exporter/importer pour diffuser sur un autre appareil.
