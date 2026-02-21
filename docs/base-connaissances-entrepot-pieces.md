# Base de connaissances IA — Entrepôt pièces de rechange automobile

## 1) Objectif métier
Mettre l'IA au service de l'exploitation pour :
- visualiser l'état des biens en temps réel,
- anticiper les arrivées conteneurs,
- limiter les ruptures atelier,
- fiabiliser la préparation et la réception.

## 2) Modèle d'état des biens (temps réel)
Chaque référence doit être classée dans un état unique :
- **disponible** : stock physiquement présent et prélevable,
- **réservé** : alloué à un ordre de travail / commande,
- **en transit** : en acheminement (fournisseur, conteneur, navette inter-sites),
- **bloqué qualité** : pièce sous contrôle, non distribuable,
- **retour fournisseur** : sortie validée vers SAV/retour.

## 3) Données minimales à collecter
- SKU, désignation, famille véhicule, criticité,
- stock théorique, stock physique, stock sécurité,
- commandes ouvertes, commandes urgentes,
- ETA fournisseur / ETA conteneur / port d'arrivée,
- statut qualité à réception,
- délai moyen d'approvisionnement.

## 4) Règles IA recommandées
1. **Alerte rupture J+7** : déclencher si la demande prévisionnelle dépasse le disponible + en transit.
2. **Alerte écart stock** : déclencher si écart théorique/physique > seuil fixé.
3. **Priorisation réception** : prioriser les références critiques immobilisant des véhicules.
4. **Plan quai dynamique** : ajuster créneaux selon ETA conteneurs et retards portuaires.

## 5) Prévision arrivées conteneurs
Pour chaque conteneur :
- récupérer ETA initiale + mises à jour transporteur,
- pondérer le risque (retard port, douane, congestion),
- produire une ETA fiable (probable, optimiste, pessimiste),
- générer automatiquement un plan de réception (équipe, quai, durée).

### Sortie attendue
- score de risque par conteneur,
- fenêtre d'arrivée prévisionnelle,
- impact estimé sur les références critiques,
- action recommandée (renfort quai, transfert inter-site, achat local d'urgence).

## 6) KPI de pilotage
- **OTIF**, **Fill Rate**, **Inventory Accuracy**,
- taux de rupture atelier,
- délai moyen de mise à disposition,
- taux de pièces en quarantaine qualité.

## 7) Boucle d'amélioration continue
- capter le feedback opérateur (bonne/mauvaise décision),
- réentraîner les règles de priorisation,
- comparer prévisions vs réel hebdomadairement,
- corriger les seuils par famille de pièces.
