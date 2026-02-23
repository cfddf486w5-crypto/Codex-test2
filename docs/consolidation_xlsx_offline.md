# Bin Map XLSX — mode offline sans dépendance

L'application DL WMS reste **100% offline** et n'embarque pas de librairie XLSX.

## Procédure recommandée
1. Ouvrir le fichier `.xlsx` dans Excel/LibreOffice.
2. Exporter uniquement la feuille de bin map en `.csv`.
3. Vérifier l'entête:
   - Colonne A: `bin`
   - Colonne B: `type`
4. Vérifier les types autorisés: `P1`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`.
5. Importer ce CSV via **Import Bin Map (.xlsx)** dans la page Consolidation.

## Pourquoi cette approche
- Pas de dépendance externe.
- Comportement prévisible offline.
- Contrôle explicite des colonnes métier (A/B).
