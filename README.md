# RAIATEA RENT CAR - Application de Fiche Client

Cette application web permet aux clients de RAIATEA RENT CAR de remplir en ligne leur fiche de renseignement, en français ou en anglais. L'application génère automatiquement un PDF et l'envoie par email à l'adresse de la société.

## Fonctionnalités

- Formulaire bilingue (français/anglais) avec changement dynamique de langue
- Sections pour conducteur principal et conducteur additionnel (optionnel)
- Informations sur les cartes de crédit (principale et supplémentaire)
- Validation des données côté client et serveur
- Génération automatique de PDF
- Envoi automatique par email à raiatearentcar@mail.pf
- Interface d'administration pour consulter les fiches clients
- Exportation des données au format CSV

## Prérequis

- Node.js (v14 ou supérieur)
- npm (inclus avec Node.js)

## Installation locale

```bash
# Cloner le dépôt
git clone https://github.com/raiatearentcar/WebCode-Fiche-Client.git

# Accéder au répertoire du projet
cd WebCode-Fiche-Client

# Installer les dépendances
npm install

# Configurer les variables d'environnement
# Créez un fichier .env à la racine du projet avec les informations suivantes :
PORT=3000
EMAIL_TO=raiatearentcar@mail.pf
EMAIL_USER=votre_adresse_email
EMAIL_PASS=votre_mot_de_passe_email
EMAIL_HOST=smtp.votre-fournisseur.com
EMAIL_PORT=587

# Démarrer l'application
npm start
```

## Déploiement sur Render

Cette application est configurée pour être facilement déployée sur Render.com :

1. Créez un compte sur [Render](https://render.com/)
2. Cliquez sur "New" puis "Web Service"
3. Connectez votre dépôt GitHub ou utilisez l'URL : `https://github.com/raiatearentcar/WebCode-Fiche-Client.git`
4. Configurez le service :
   - **Name** : raiatea-rent-car
   - **Environment** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`

5. Ajoutez les variables d'environnement suivantes :
   - `EMAIL_TO` : raiatearentcar@mail.pf
   - `EMAIL_USER` : votre_adresse_email
   - `EMAIL_PASS` : votre_mot_de_passe
   - `EMAIL_HOST` : smtp.votre-fournisseur.com
   - `EMAIL_PORT` : 587

6. Cliquez sur "Create Web Service"

L'application sera automatiquement déployée et accessible via l'URL fournie par Render.

4. Configurez les variables d'environnement:
   - Renommez le fichier `.env.example` en `.env`
   - Modifiez les valeurs selon votre configuration (notamment les informations SMTP pour l'envoi d'emails)

## Lancement de l'application

Pour démarrer l'application en mode développement:

```bash
npm run dev
```

Pour démarrer l'application en mode production:

```bash
npm start
```

L'application sera accessible à l'adresse: http://localhost:3000

## Utilisation

### Envoi du lien aux clients

Pour envoyer un lien à un client, utilisez l'URL suivante:
```
http://votre-domaine.com/form
```

Chaque client recevra un ID unique lors de sa visite, et ses données seront associées à cet ID.

### Interface d'administration

Pour accéder à l'interface d'administration:
```
http://votre-domaine.com/admin
```

Cette interface vous permet de:
- Consulter toutes les fiches clients soumises
- Filtrer et rechercher des clients
- Voir les détails complets de chaque client
- Télécharger les PDF générés
- Renvoyer les emails si nécessaire
- Exporter les données au format CSV

## Déploiement

Pour déployer cette application sur un serveur de production:

1. Transférez tous les fichiers sur votre serveur
2. Installez les dépendances: `npm install --production`
3. Configurez le fichier `.env` avec les paramètres de production
4. Démarrez l'application: `npm start`

Pour une disponibilité continue, il est recommandé d'utiliser un gestionnaire de processus comme PM2:

```bash
npm install -g pm2
pm2 start server.js --name "raiatea-client-form"
```

## Structure du projet

```
raiatea-rent-car-client-form/
├── public/              # Fichiers statiques
│   ├── css/             # Styles CSS
│   ├── js/              # Scripts JavaScript
│   ├── index.html       # Page du formulaire client
│   └── admin.html       # Interface d'administration
├── pdfs/                # Dossier où sont stockés les PDF générés
├── server.js            # Point d'entrée de l'application
├── package.json         # Dépendances et scripts
├── .env                 # Variables d'environnement
└── database.sqlite      # Base de données SQLite
```

## Personnalisation

Vous pouvez personnaliser l'apparence de l'application en modifiant les fichiers CSS dans le dossier `public/css/`.

Pour modifier le format du PDF généré, vous pouvez éditer la fonction `generatePDF` dans le fichier `server.js`.

## Support

Pour toute question ou assistance, veuillez contacter le développeur.
