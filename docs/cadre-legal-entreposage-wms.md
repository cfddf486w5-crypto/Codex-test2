# Cadre légal — Entreposage à grand volume & applications WMS (France / UE)

> **Note importante** : ce document est une synthèse opérationnelle, pas un avis juridique. Les obligations exactes dépendent du secteur (automobile, pharma, alimentaire, matières dangereuses), du site, des contrats clients et des autorités compétentes.

## 1) Problèmes juridiques fréquents en entrepôt grand volume

### 1.1 Sécurité des salariés et risques d'accident
**Problème**
- Coactivité intense (caristes, piétons, quai), TMS, collisions, chutes, accidents de manutention.
- Risque de non-conformité sur l'évaluation des risques, la formation et la traçabilité des incidents.

**Base légale (France/UE)**
- Code du travail : obligation générale de sécurité de l'employeur (prévention, information, formation).
- Document Unique d'Évaluation des Risques (DUERP) et mise à jour régulière.
- Règles CACES / habilitations internes selon équipements.

**Solutions appuyées par WMS**
- Droits par rôle (qui peut conduire quoi), blocage des tâches non autorisées.
- Check-lists sécurité digitalisées (prise de poste, état chariot, quai).
- Historique horodaté des mouvements pour investigations post-incident.
- Géofencing / règles de circulation et alertes en zones à risque.

---

### 1.2 Incendie, stockage massif et conformité bâtiment
**Problème**
- Densité de stockage élevée (palettiers, batteries lithium, produits combustibles) augmentant l'exposition incendie.
- Contrôles réglementaires incomplets (plans d'évacuation, équipements incendie, maintenance).

**Base légale (France)**
- Réglementation ERP/Code du travail selon type de bâtiment.
- Régime ICPE si seuils atteints (rubriques selon activités/produits).
- Prescriptions préfectorales et exigences d'inspection périodique.

**Solutions appuyées par WMS**
- Cartographie des emplacements par classes de risque (inflammable, ADR, batteries, etc.).
- Règles automatiques d'incompatibilité de stockage.
- Journal de conformité : rondes, contrôles extincteurs, exercices évacuation.
- Traçabilité des lots pour isolement rapide en cas d'incident.

---

### 1.3 Matières dangereuses et transport
**Problème**
- Erreurs de classement/étiquetage des marchandises dangereuses.
- Non-respect des règles de séparation, de conditionnement ou de documentation transport.

**Base légale (UE/International)**
- ADR (route), RID (rail), IMDG (maritime), IATA (aérien) selon mode.
- CLP/REACH pour classification et information substance/mélange.

**Solutions appuyées par WMS**
- Fiches article enrichies (UN number, classe ADR, groupe d'emballage).
- Contrôles bloquants avant expédition (documents, compatibilité, quantité).
- Génération assistée de documents logistiques conformes.
- Alertes de péremption des FDS et versioning documentaire.

---

### 1.4 Traçabilité, qualité produit et rappels
**Problème**
- Difficulté à remonter rapidement l'historique lot/série (réception → stockage → préparation → expédition).
- Risque de sanctions et coûts élevés lors d'un rappel produit mal piloté.

**Base légale (selon secteur)**
- Exigences de traçabilité (notamment alimentaire, santé, automobile qualité fournisseur/client).
- Obligations contractuelles clients (SLAs, audits, preuves de conformité).

**Solutions appuyées par WMS**
- Traçabilité fine par lot, série, DLC/DDM, poste opérateur et timestamp.
- Workflows de quarantaine / blocage qualité.
- Recherche descendante et ascendante (one-up / one-down) en quelques minutes.
- Dossiers d'audit exportables (preuves d'exécution et exceptions).

---

### 1.5 Données personnelles (RGPD) dans les outils logistiques
**Problème**
- Le WMS traite souvent des données RH/opérateurs et parfois des données clients (noms, adresses, signatures).
- Risques : base légale floue, conservation excessive, accès trop large, sous-traitance non encadrée.

**Base légale (UE)**
- RGPD : minimisation, finalité, durée de conservation, sécurité, droits des personnes.
- Encadrement des sous-traitants (DPA), registre des traitements, gestion des violations.

**Solutions appuyées par WMS**
- Politique de rétention automatisée (purge/anonymisation).
- Contrôles d'accès granulaires + journalisation inviolable.
- Cloisonnement des environnements et chiffrement au repos/en transit.
- Exports RGPD (droit d'accès) et procédures de suppression.

---

### 1.6 Douane, TVA, e-commerce et flux internationaux
**Problème**
- Mauvaise qualité des données douanières (origine, nomenclature, valeur), créant retards et redressements.
- Complexité TVA intra-UE/e-commerce (OSS/IOSS) et preuves de transport.

**Base légale (UE/France)**
- Code des douanes de l'Union (CDU/UCC) et règles d'origine.
- Exigences fiscales TVA et obligations de facturation applicables.

**Solutions appuyées par WMS**
- Contrôles de complétude des données article avant sortie export.
- Lien WMS–TMS–ERP pour cohérence documentaire (packing list, facture, MRN).
- Archivage probant des preuves logistiques et de livraison.

---

## 2) Applications WMS qui ont aidé (approches constatées)

> Les solutions ci-dessous sont présentées par **capacités utiles** (et non comme conseil d'achat d'un éditeur précis).

### 2.1 WMS cloud avec moteur de règles et audit trail
**Apport**
- Réduction des erreurs d'exécution et meilleure preuve de conformité.

**Cas d'usage légal couvert**
- Traçabilité audit, séparation des rôles, démonstration de contrôle interne.

### 2.2 WMS + QMS (qualité) intégré
**Apport**
- Maîtrise des non-conformités, CAPA, quarantaine et libération qualité.

**Cas d'usage légal couvert**
- Conformité qualité sectorielle, gestion de rappels, preuve de traitement des écarts.

### 2.3 WMS + modules HazMat / ADR
**Apport**
- Contrôle de compatibilité matières dangereuses et documentation transport.

**Cas d'usage légal couvert**
- Réduction du risque de non-conformité ADR/CLP/REACH.

### 2.4 WMS + IAM/SSO + SIEM
**Apport**
- Sécurité renforcée, traçabilité des accès, détection d'anomalies cyber.

**Cas d'usage légal couvert**
- RGPD (sécurité), auditabilité et gouvernance des accès.

### 2.5 WMS + IoT (température, chocs, géolocalisation)
**Apport**
- Preuve continue des conditions de stockage/transport.

**Cas d'usage légal couvert**
- Chaîne du froid, intégrité produit, litiges transport et assurances.

---

## 3) Plan d'intégration légal dans votre WMS (pratique)

1. **Cartographier les obligations** par flux : réception, stockage, préparation, expédition, retours.
2. **Transformer chaque obligation en règle système** : champ obligatoire, blocage, alerte, preuve à conserver.
3. **Définir les responsabilités RACI** : exploitation, QHSE, DPO, IT, douane/fiscal.
4. **Mettre en place un référentiel documentaire** : versions, dates d'effet, propriétaires.
5. **Tester mensuellement par scénarios** : incident sécurité, rappel lot, violation RGPD, contrôle douane.
6. **Mesurer des KPI conformité** : taux de blocage préventif, délai de traçabilité, conformité inventaire, incidents.
7. **Préparer les audits** : exports standards, pistes d'audit, preuves de formation.

---

## 4) Matrice Problème → Exigence → Contrôle WMS (exemple)

| Problème | Exigence légale / normative | Contrôle WMS recommandé | Preuve attendue |
|---|---|---|---|
| Collision quai/chariot | Obligation de prévention sécurité | Autorisation tâche par habilitation + check-list départ | Journal des habilitations, checklist signée |
| Stock incompatible (dangereux) | ADR/CLP + prescriptions site | Règle d'incompatibilité emplacement (blocante) | Log de blocage et correction |
| Rappel lot lent | Traçabilité sectorielle | Suivi lot/série de bout en bout | Rapport de traçabilité < 2h |
| Données perso trop longtemps conservées | RGPD minimisation/conservation | Purge automatique + anonymisation | Journal de purge + politique validée |
| Erreur export douane | CDU/UCC + TVA | Contrôle données avant expédition | Dossier export complet horodaté |

---

## 5) Clauses contractuelles à sécuriser avec l'éditeur/intégrateur WMS
- Localisation des données, sous-traitants ultérieurs, réversibilité.
- SLA de disponibilité + RTO/RPO, sauvegardes et tests de restauration.
- Journalisation et accès aux logs pour audit client/autorité.
- Notification d'incident sécurité et support conformité RGPD.
- Traçabilité des changements (release notes) et validation avant mise en production.

## 6) Limites et gouvernance
- Un WMS **n'assure pas à lui seul** la conformité : il exécute des contrôles définis par l'organisation.
- Les contrôles juridiques doivent être revus avec les équipes QHSE, DPO, fiscalité/douane et conseil juridique.
- Mettre à jour ce référentiel au minimum trimestriellement ou à chaque changement réglementaire majeur.
