# DEVBOOK - RAIATEA RENT CAR Client Form Application

## Vue d'ensemble technique

Ce document détaille les spécifications techniques, l'architecture et les choix de conception de l'application de formulaire client pour RAIATEA RENT CAR.

## Table des matières

1. [Architecture générale](#architecture-générale)
2. [Stack technologique](#stack-technologique)
3. [Structure du projet](#structure-du-projet)
4. [Modèle de données](#modèle-de-données)
5. [API Backend](#api-backend)
6. [Frontend](#frontend)
7. [Gestion des langues](#gestion-des-langues)
8. [Signature manuscrite](#signature-manuscrite)
9. [Génération de PDF](#génération-de-pdf)
10. [Envoi d'emails](#envoi-demails)
11. [Identification des fiches clients](#identification-des-fiches-clients)
12. [Thème et couleurs](#thème-et-couleurs)
13. [Sécurité](#sécurité)
14. [Déploiement](#déploiement)
15. [Maintenance et évolution](#maintenance-et-évolution)

## Architecture générale

L'application suit une architecture client-serveur classique :

- **Client** : Application web responsive en HTML/CSS/JavaScript
- **Serveur** : API REST Node.js/Express
- **Persistance** : Base de données SQLite
- **Services** : Génération de PDF et envoi d'emails

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│             │       │             │       │             │
│   Client    │◄─────►│   Serveur   │◄─────►│  Base de    │
│  (Browser)  │       │  (Node.js)  │       │  données    │
│             │       │             │       │  (SQLite)   │
└─────────────┘       └──────┬──────┘       └─────────────┘
                             │
                      ┌──────┴──────┐
                      │             │
                      │  Services   │
                      │ (PDF/Email) │
                      │             │
                      └─────────────┘
```

## Stack technologique

### Backend
- **Runtime** : Node.js (v14+)
- **Framework** : Express.js
- **Base de données** : SQLite3
- **Génération PDF** : PDFKit
- **Envoi d'emails** : Nodemailer
- **Autres bibliothèques** :
  - `uuid` : Génération d'identifiants uniques
  - `dotenv` : Gestion des variables d'environnement
  - `cors` : Gestion des requêtes cross-origin
  - `body-parser` : Parsing des requêtes HTTP

### Frontend
- **HTML5** / **CSS3** / **JavaScript** (ES6+)
- **Bibliothèques externes** :
  - Font Awesome (icônes)
  - SignaturePad.js (signature manuscrite)
  - Aucun framework JavaScript lourd pour garantir des performances optimales

## Structure du projet

```
raiatea-rent-car-client-form/
├── public/                  # Fichiers statiques
│   ├── css/                 # Styles CSS
│   │   ├── style.css        # Styles du formulaire client
│   │   └── admin-style.css  # Styles de l'interface admin
│   ├── js/                  # Scripts JavaScript
│   │   ├── script.js        # Logique du formulaire client
│   │   ├── admin.js         # Logique de l'interface admin
│   │   └── signature_pad.min.js # Bibliothèque pour la signature manuscrite
│   ├── index.html           # Page du formulaire client
│   └── admin.html           # Interface d'administration
├── pdfs/                    # Dossier où sont stockés les PDF générés
├── server.js                # Point d'entrée de l'application
├── package.json             # Dépendances et scripts
├── .env                     # Variables d'environnement
├── README.md                # Documentation utilisateur
├── DEVBOOK.md               # Documentation technique
└── database.sqlite          # Base de données SQLite
```

## Modèle de données

La base de données utilise une table principale `clients` avec la structure suivante :

| Champ                                  | Type      | Description                                      |
|----------------------------------------|-----------|--------------------------------------------------|
| id                                     | TEXT      | Identifiant unique (timestamp_UUID)              |
| language                               | TEXT      | Langue du formulaire (fr/en)                     |
| main_driver_name                       | TEXT      | Nom du conducteur principal                      |
| main_driver_firstname                  | TEXT      | Prénom du conducteur principal                   |
| main_driver_address                    | TEXT      | Adresse (rue) du conducteur principal            |
| main_driver_postal_code                | TEXT      | Code postal du conducteur principal              |
| main_driver_city                       | TEXT      | Ville du conducteur principal                    |
| main_driver_country                    | TEXT      | Pays du conducteur principal                     |
| main_driver_birth_date                 | TEXT      | Date de naissance du conducteur principal        |
| main_driver_birth_place                | TEXT      | Lieu de naissance du conducteur principal        |
| main_driver_phone                      | TEXT      | Téléphone du conducteur principal                |
| main_driver_license_number             | TEXT      | N° de permis du conducteur principal             |
| main_driver_license_issue_date         | TEXT      | Date d'émission du permis du conducteur principal|
| main_driver_license_validity_date      | TEXT      | Date de validité du permis du conducteur principal|
| main_driver_license_issue_place        | TEXT      | Lieu d'émission du permis du conducteur principal|
| main_driver_email                      | TEXT      | Email du conducteur principal                    |
| main_driver_credit_card                | TEXT      | N° de carte de crédit du conducteur principal    |
| main_driver_credit_card_expiry         | TEXT      | Date d'expiration de la carte du conducteur principal|
| has_additional_driver                  | BOOLEAN   | Présence d'un conducteur additionnel             |
| additional_driver_name                 | TEXT      | Nom du conducteur additionnel                    |
| additional_driver_firstname            | TEXT      | Prénom du conducteur additionnel                 |
| additional_driver_address              | TEXT      | Adresse (rue) du conducteur additionnel          |
| additional_driver_postal_code          | TEXT      | Code postal du conducteur additionnel            |
| additional_driver_city                 | TEXT      | Ville du conducteur additionnel                  |
| additional_driver_country              | TEXT      | Pays du conducteur additionnel                   |
| additional_driver_birth_date           | TEXT      | Date de naissance du conducteur additionnel      |
| additional_driver_birth_place          | TEXT      | Lieu de naissance du conducteur additionnel      |
| additional_driver_phone                | TEXT      | Téléphone du conducteur additionnel              |
| additional_driver_license_number       | TEXT      | N° de permis du conducteur additionnel           |
| additional_driver_license_issue_date   | TEXT      | Date d'émission du permis du conducteur additionnel|
| additional_driver_license_issue_place  | TEXT      | Lieu d'émission du permis du conducteur additionnel|
| additional_driver_license_validity_date| TEXT      | Date de validité du permis du conducteur additionnel|
| additional_driver_email                | TEXT      | Email du conducteur additionnel                  |
| has_additional_credit_card             | BOOLEAN   | Présence d'une carte de crédit supplémentaire    |
| additional_credit_card                 | TEXT      | N° de la carte de crédit supplémentaire          |
| additional_credit_card_expiry          | TEXT      | Date d'expiration de la carte supplémentaire     |
| accept_fines                           | BOOLEAN   | Acceptation des conditions sur les amendes       |
| accept_data_processing                 | BOOLEAN   | Acceptation du traitement des données personnelles|
| signature_date                         | TEXT      | Date de signature                                |
| signature_name                         | TEXT      | Nom de signature                                 |
| signature_data                         | TEXT      | Données de la signature manuscrite (base64)     |
| submission_date                        | TIMESTAMP | Date et heure de soumission                      |

## API Backend

Le serveur Express expose les endpoints suivants :

| Endpoint                     | Méthode | Description                                       |
|------------------------------|---------|---------------------------------------------------|
| `/api/generate-client-id`    | GET     | Génère un ID unique pour un nouveau client        |
| `/api/submit-form`           | POST    | Traite la soumission du formulaire                |
| `/api/clients`               | GET     | Récupère la liste des clients (admin)             |
| `/api/download-pdf/:clientId`| GET     | Télécharge le PDF d'un client spécifique          |
| `/api/resend-email/:clientId`| POST    | Renvoie l'email avec le PDF pour un client        |
| `/form/:clientId`            | GET     | Affiche le formulaire pour un client spécifique   |
| `/admin`                     | GET     | Affiche l'interface d'administration              |

## Frontend

### Formulaire client (index.html)

Le formulaire client est structuré en sections correspondant aux différentes parties de la fiche client :
- Informations société (statique)
- Conducteur principal
- Carte de crédit
- Conducteur additionnel (optionnel)
- Carte de crédit supplémentaire (optionnelle)
- Informations sur les amendes
- Traitement des données personnelles
- Signature

La validation côté client vérifie :
- Les champs obligatoires
- Le format des emails
- Le format des numéros de téléphone
- Le format des numéros de carte de crédit
- La cohérence des dates

### Interface d'administration (admin.html)

L'interface d'administration permet :
- L'affichage de la liste des clients
- La recherche et le filtrage des clients
- La visualisation détaillée des informations d'un client
- Le téléchargement des PDF générés
- Le renvoi des emails
- L'exportation des données au format CSV

## Gestion des langues

L'application est entièrement bilingue (français/anglais). La gestion des langues est implémentée via :

1. **Sélecteur de langue** : Menu déroulant en haut de la page
2. **Classes CSS conditionnelles** : Éléments avec classes `.lang-fr` et `.lang-en`
3. **Attribut data-language** : Appliqué sur le body pour contrôler l'affichage
4. **Stockage de la langue** : Sauvegardée dans la base de données avec chaque soumission

Exemple de code HTML pour un élément bilingue :
```html
<label for="main-driver-name" class="lang-fr">Nom</label>
<label for="main-driver-name" class="lang-en">Name</label>
```

Exemple de code CSS pour la gestion des langues :
```css
.lang-fr, .lang-en {
    display: none;
}

body[data-language="fr"] .lang-fr {
    display: block;
}

body[data-language="en"] .lang-en {
    display: block;
}
```

## Signature manuscrite

L'application intègre une fonctionnalité de signature manuscrite permettant aux clients de signer directement sur l'écran avec leur doigt ou leur souris.

### Implémentation technique

1. **Bibliothèque utilisée** : SignaturePad.js, une bibliothèque légère et performante pour la capture de signatures

2. **Composants** :
   - Canvas HTML5 pour le dessin de la signature
   - Stockage de la signature en base64 dans un champ caché du formulaire
   - Bouton d'effacement pour recommencer la signature

3. **Validation** :
   - Vérification que la signature n'est pas vide avant soumission
   - Message d'alerte si l'utilisateur tente de soumettre sans signer

4. **Stockage et transmission** :
   - La signature est convertie en image base64
   - Elle est transmise avec les autres données du formulaire
   - Elle est stockée dans la base de données dans le champ `signature_data`

5. **Intégration dans le PDF** :
   - La signature est insérée dans le PDF généré
   - Elle apparaît sous le nom du signataire et la date

Cette fonctionnalité améliore l'expérience utilisateur et ajoute une couche d'authenticité aux fiches clients.

## Génération de PDF

Les PDF sont générés à l'aide de la bibliothèque PDFKit. Le processus est le suivant :

1. Réception des données du formulaire
2. Création d'un nouveau document PDF
3. Ajout des éléments dans la langue choisie (en-tête, sections, données)
4. Sauvegarde du PDF dans le dossier `pdfs/`
5. Envoi du PDF par email

Le PDF généré respecte la structure de la fiche client originale et inclut toutes les informations saisies par le client.

## Envoi d'emails

L'envoi d'emails est géré par Nodemailer. Configuration :

```javascript
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

L'email envoyé contient :
- Un sujet mentionnant qu'il s'agit d'une nouvelle fiche client avec le nom, prénom et ID du client
- Un corps de message détaillé incluant les informations principales du client (ID, nom, prénom, email, téléphone, date de soumission)
- Le PDF généré en pièce jointe, nommé avec l'ID, le nom et le prénom du client

## Identification des fiches clients

Chaque fiche client est identifiée de manière unique et traçable grâce à plusieurs mécanismes :

1. **Génération d'ID unique** :
   - Format : `timestamp_uuid`
   - L'horodatage permet une meilleure traçabilité chronologique
   - L'UUID garantit l'unicité même en cas de soumissions simultanées

2. **Nommage des fichiers PDF** :
   - Format : `ID_Nom_Prénom.pdf`
   - Facilite l'identification et le classement des documents

3. **Interface d'administration** :
   - Affichage de l'ID client dans une colonne dédiée
   - Possibilité de filtrer et rechercher par ID, nom ou prénom

4. **Emails** :
   - L'objet de l'email inclut l'ID du client
   - Le corps de l'email contient un résumé des informations principales

Cette approche permet une gestion efficace des fiches clients et facilite le suivi administratif.

## Thème et couleurs

L'application utilise une palette de couleurs correspondant à l'identité visuelle de RAIATEA RENT CAR :

1. **Couleurs principales** :
   - Jaune doré (#E6B800) pour les éléments principaux (en-têtes, boutons d'action)
   - Gris foncé (#6B6B6B) pour les éléments secondaires et accents

2. **Application des couleurs** :
   - En-têtes des sections en jaune doré
   - Boutons principaux en jaune doré
   - Boutons secondaires en gris
   - Bordures et accents en gris

3. **Implémentation technique** :
   - Utilisation de variables CSS pour une cohérence globale
   - Adaptation des couleurs pour une meilleure lisibilité et un confort visuel

Cette palette de couleurs offre une expérience utilisateur agréable tout en renforçant l'identité de marque.

## Sécurité

Mesures de sécurité implémentées :

1. **Protection des données sensibles** :
   - Variables d'environnement pour les informations de connexion
   - Masquage partiel des numéros de carte de crédit dans l'interface admin

2. **Validation des données** :
   - Validation côté client pour l'expérience utilisateur
   - Validation côté serveur pour garantir l'intégrité des données

3. **Identifiants uniques** :
   - Utilisation d'UUID pour identifier chaque soumission de formulaire

4. **Consentement explicite** :
   - Cases à cocher obligatoires pour l'acceptation des conditions
   - Information claire sur le traitement des données personnelles

## Déploiement

Options de déploiement recommandées :

### Hébergement mutualisé
1. Transférer les fichiers via FTP
2. Configurer Node.js (si disponible)
3. Configurer les variables d'environnement

### VPS / Serveur dédié
1. Cloner le dépôt
2. Installer les dépendances : `npm install --production`
3. Configurer le fichier `.env`
4. Utiliser PM2 pour la gestion des processus :
   ```
   npm install -g pm2
   pm2 start server.js --name "raiatea-client-form"
   pm2 startup
   pm2 save
   ```

### Services cloud (Heroku, DigitalOcean, etc.)
1. Suivre la documentation spécifique au service
2. Configurer les variables d'environnement dans l'interface du service
3. Connecter au dépôt Git pour le déploiement automatique

## Maintenance et évolution

Suggestions pour l'évolution future de l'application :

1. **Authentification admin** :
   - Ajouter un système de connexion pour sécuriser l'interface d'administration

2. **Notifications** :
   - Ajouter des notifications par SMS ou WhatsApp pour les nouvelles soumissions

3. **Intégration avec d'autres systèmes** :
   - API pour intégrer les données avec un système de gestion de location

4. **Amélioration de l'interface** :
   - Personnalisation avancée selon la charte graphique
   - Mode sombre

5. **Fonctionnalités avancées** :
   - Téléchargement de documents (copie du permis, etc.)
   - Paiement en ligne d'acompte
   - Capture de photo via webcam/caméra du téléphone

6. **Optimisations techniques** :
   - Migration vers une base de données plus robuste (MySQL, PostgreSQL)
   - Mise en cache pour améliorer les performances
   - Implémentation de tests automatisés
