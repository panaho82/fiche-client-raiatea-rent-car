require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Définir l'environnement (production sur Render, développement en local)
if (process.env.RENDER) {
  process.env.NODE_ENV = 'production';
} else {
  process.env.NODE_ENV = 'development';
}

// Vérifier si le dossier public existe, sinon le créer
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Le dossier public n\'existe pas, création...');
  fs.mkdirSync(publicDir, { recursive: true });
}

// Vérifier si index.html existe, sinon le créer
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('Fichier index.html manquant, création d\'un fichier temporaire...');
  fs.writeFileSync(indexPath, `<!DOCTYPE html>
<html>
<head>
    <title>RAIATEA RENT CAR</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #FFD700; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RAIATEA RENT CAR - Fiche Client</h1>
        <p>Le formulaire est en cours de maintenance. Veuillez réessayer plus tard.</p>
        <p>The form is currently under maintenance. Please try again later.</p>
    </div>
</body>
</html>`);
}

// Vérifier si admin.html existe, sinon le créer
const adminPath = path.join(publicDir, 'admin.html');
if (!fs.existsSync(adminPath)) {
  console.log('Fichier admin.html manquant, création d\'un fichier temporaire...');
  fs.writeFileSync(adminPath, `<!DOCTYPE html>
<html>
<head>
    <title>RAIATEA RENT CAR - Administration</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #FFD700; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RAIATEA RENT CAR - Administration</h1>
        <p>L'interface d'administration est en cours de maintenance. Veuillez réessayer plus tard.</p>
    </div>
</body>
</html>`);
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));  // Augmenter la limite pour les signatures
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(publicDir));

// Route principale pour s'assurer que l'application fonctionne sur Render
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    // Lire le fichier HTML et s'assurer que le message de succès est caché
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Erreur lors de la lecture du fichier index.html:', err);
        return res.status(500).send('Erreur lors du chargement de la page');
      }
      
      // S'assurer que le message de succès est caché
      const modifiedHtml = data.replace(
        /<div id="success-message"[^>]*>/g, 
        '<div id="success-message" class="hidden" style="display: none;">'        
      );
      
      res.send(modifiedHtml);
    });
  } else {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>RAIATEA RENT CAR</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RAIATEA RENT CAR - Fiche Client</h1>
        <p>Le formulaire est en cours de maintenance. Veuillez réessayer plus tard.</p>
        <p>The form is currently under maintenance. Please try again later.</p>
    </div>
</body>
</html>`);
  }
});

// Route pour l'interface d'administration
app.get('/admin', (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>RAIATEA RENT CAR - Administration</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #333333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RAIATEA RENT CAR - Administration</h1>
        <p>L'interface d'administration est en cours de maintenance. Veuillez réessayer plus tard.</p>
    </div>
</body>
</html>`);
  }
});

// Route de diagnostic pour vérifier l'état du serveur
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    render: process.env.RENDER ? true : false,
    time: new Date().toISOString(),
    publicDir: fs.existsSync(publicDir),
    indexHtml: fs.existsSync(path.join(publicDir, 'index.html')),
    adminHtml: fs.existsSync(path.join(publicDir, 'admin.html'))
  });
});

// Initialisation de la base de données
// Utiliser un chemin qui fonctionne à la fois en local et sur Render
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/database.sqlite' : './database.sqlite';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite');
    
    // Déterminer si la base de données doit être recréée
    const shouldRebuild = process.env.REBUILD_DATABASE === 'true';
    
    // Si la base de données doit être recréée, supprimer la table clients
    if (shouldRebuild) {
      console.log('Reconstruction de la base de données...');
      db.run(`DROP TABLE IF EXISTS clients`, (err) => {
        if (err) {
          console.error('Erreur lors de la suppression de la table clients:', err.message);
        } else {
          console.log('Table clients supprimée avec succès');
        }
      });
    }
    
    // SOLUTION FINALE: Création d'une table avec TOUS les champs possibles
    // Pour éviter tout problème, on accepte n'importe quelle colonne
    db.run(`CREATE TABLE IF NOT EXISTS clients (
      /* ID et langue */
      id TEXT PRIMARY KEY,
      language TEXT,
      
      /* Tous les champs possibles pour le conducteur principal */
      main_driver_name TEXT,
      main_driver_firstname TEXT,
      main_driver_birth_date TEXT,
      main_driver_birth_place TEXT,
      main_driver_nationality TEXT,
      main_driver_passport TEXT,
      main_driver_passport_issue_date TEXT,
      main_driver_passport_expiry_date TEXT,
      main_driver_license TEXT,
      main_driver_license_number TEXT,
      main_driver_license_issue_date TEXT,
      main_driver_license_validity_date TEXT,
      main_driver_license_expiry_date TEXT,
      main_driver_license_issue_place TEXT,
      main_driver_address TEXT,
      main_driver_city TEXT,
      main_driver_postal_code TEXT,
      main_driver_country TEXT,
      main_driver_phone TEXT,
      main_driver_email TEXT,
      main_driver_hotel TEXT,
      
      /* Tous les champs possibles pour le conducteur additionnel */
      has_additional_driver BOOLEAN,
      additional_driver_name TEXT,
      additional_driver_firstname TEXT,
      additional_driver_birth_date TEXT,
      additional_driver_birth_place TEXT,
      additional_driver_nationality TEXT,
      additional_driver_phone TEXT,
      additional_driver_email TEXT,
      additional_driver_address TEXT,
      additional_driver_postal_code TEXT,
      additional_driver_city TEXT,
      additional_driver_country TEXT,
      additional_driver_license TEXT,
      additional_driver_license_number TEXT,
      additional_driver_license_issue_date TEXT,
      additional_driver_license_validity_date TEXT,
      additional_driver_license_expiry_date TEXT,
      additional_driver_license_issue_place TEXT,
      
      /* Tous les champs possibles pour les cartes de crédit */
      main_driver_credit_card TEXT,
      main_driver_credit_card_expiry TEXT,
      main_card_type TEXT,
      main_card_number TEXT,
      main_card_expiry_date TEXT,
      main_card_holder_name TEXT,
      
      /* Tous les champs possibles pour les cartes additionnelles */
      has_additional_credit_card BOOLEAN,
      has_additional_card BOOLEAN,
      additional_credit_card TEXT,
      additional_credit_card_expiry TEXT,
      additional_driver_credit_card TEXT,
      additional_driver_credit_card_expiry TEXT,
      additional_card_type TEXT,
      additional_card_number TEXT,
      additional_card_expiry_date TEXT,
      additional_card_holder_name TEXT,
      
      /* Tous les champs possibles pour la signature et acceptation */
      accept_terms BOOLEAN,
      accept_data_processing BOOLEAN,
      signature_date TEXT,
      signature_name TEXT,
      signature_data TEXT,
      submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Fonction pour générer le PDF
function generatePDF(clientData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const pdfDir = process.env.NODE_ENV === 'production' ? '/tmp/pdfs' : './pdfs';
    const pdfPath = `${pdfDir}/${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`;
    
    // Assurez-vous que le dossier pdfs existe
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }
    
    const pdfStream = fs.createWriteStream(pdfPath);
    
    // Événements de stream
    pdfStream.on('finish', () => {
      resolve(pdfPath);
    });
    
    pdfStream.on('error', (err) => {
      reject(err);
    });
    
    // Pipe le PDF vers le stream
    doc.pipe(pdfStream);
    
    // Déterminer la langue
    const isFrench = clientData.language === 'fr';
    
    // Textes selon la langue
    const texts = {
      title: isFrench ? 'Fiche de renseignements client' : 'Client Information Form',
      mainDriver: isFrench ? 'Conducteur Principal' : 'Main Driver',
      additionalDriver: isFrench ? 'Conducteur Additionnel' : 'Additional Driver',
      mainCreditCard: isFrench ? 'Carte de Crédit Principale' : 'Main Credit Card',
      additionalCreditCard: isFrench ? 'Carte de Crédit Supplémentaire' : 'Additional Credit Card',
      name: isFrench ? 'Nom' : 'Name',
      firstname: isFrench ? 'Prénom' : 'Firstname',
      birthDate: isFrench ? 'Date de naissance' : 'Birth date',
      birthPlace: isFrench ? 'Lieu de naissance' : 'Birth place',
      nationality: isFrench ? 'Nationalité' : 'Nationality',
      passport: isFrench ? 'N° Passeport' : 'Passport No.',
      issueDate: isFrench ? 'Date d\'\u00e9mission' : 'Issue date',
      expiryDate: isFrench ? 'Date d\'expiration' : 'Expiry date',
      licenseNumber: isFrench ? 'N° Permis de conduire' : 'Driver\'s license number',
      issuePlace: isFrench ? 'Lieu d\'\u00e9mission' : 'Issue place',
      address: isFrench ? 'Adresse' : 'Address',
      city: isFrench ? 'Ville' : 'City',
      postalCode: isFrench ? 'Code Postal' : 'Postal Code',
      country: isFrench ? 'Pays' : 'Country',
      phone: isFrench ? 'Téléphone' : 'Phone',
      email: isFrench ? 'Email' : 'Email',
      hotel: isFrench ? 'Hôtel / Pension / Bateau' : 'Hotel / Guesthouse / Boat',
      cardType: isFrench ? 'Type de carte' : 'Card type',
      cardNumber: isFrench ? 'Numéro de carte' : 'Card number',
      cardHolder: isFrench ? 'Nom du titulaire' : 'Card holder name',
      signature: isFrench ? 'Signature' : 'Signature',
      date: isFrench ? 'Date' : 'Date'
    };
    
    // En-tête
    doc.fontSize(20).text('RAIATEA RENT CAR', { align: 'center' });
    doc.fontSize(16).text(texts.title, { align: 'center' });
    doc.moveDown();
    
    // ID du client
    doc.fontSize(12).text(`ID: ${clientData.id}`, { align: 'right' });
    doc.moveDown();
    
    // Conducteur principal
    doc.fontSize(14).text(texts.mainDriver, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`${texts.name}: ${clientData.main_driver_name}`);
    doc.text(`${texts.firstname}: ${clientData.main_driver_firstname}`);
    doc.text(`${texts.birthDate}: ${clientData.main_driver_birth_date}`);
    doc.text(`${texts.birthPlace}: ${clientData.main_driver_birth_place}`);
    doc.text(`${texts.nationality}: ${clientData.main_driver_nationality || ''}`);
    
    if (clientData.main_driver_passport) {
      doc.text(`${texts.passport}: ${clientData.main_driver_passport}`);
      doc.text(`${texts.issueDate}: ${clientData.main_driver_passport_issue_date}`);
      doc.text(`${texts.expiryDate}: ${clientData.main_driver_passport_expiry_date}`);
    }
    
    doc.text(`${texts.licenseNumber}: ${clientData.main_driver_license_number || ''}`);
    doc.text(`${texts.issueDate}: ${clientData.main_driver_license_issue_date || ''}`);
    doc.text(`${texts.expiryDate}: ${clientData.main_driver_license_validity_date || ''}`);
    doc.text(`${texts.issuePlace}: ${clientData.main_driver_license_issue_place || ''}`);
    
    // Ajouter les images du permis de conduire du conducteur principal si disponibles
    if (clientData.main_driver_license_front_data) {
      doc.moveDown();
      doc.fontSize(10).text(isFrench ? 'Photo du permis (recto):' : 'Driver\'s license photo (front):', { continued: false });
      try {
        doc.image(clientData.main_driver_license_front_data, {
          fit: [250, 150],
          align: 'center'
        });
      } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'image recto du permis au PDF:', error);
      }
    }
    
    if (clientData.main_driver_license_back_data) {
      doc.moveDown();
      doc.fontSize(10).text(isFrench ? 'Photo du permis (verso):' : 'Driver\'s license photo (back):', { continued: false });
      try {
        doc.image(clientData.main_driver_license_back_data, {
          fit: [250, 150],
          align: 'center'
        });
      } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'image verso du permis au PDF:', error);
      }
    }

    doc.moveDown();
    doc.text(`${texts.address}: ${clientData.main_driver_address}`);
    doc.text(`${texts.city}: ${clientData.main_driver_city}`);
    doc.text(`${texts.postalCode}: ${clientData.main_driver_postal_code}`);
    doc.text(`${texts.country}: ${clientData.main_driver_country}`);
    doc.text(`${texts.phone}: ${clientData.main_driver_phone}`);
    doc.text(`${texts.email}: ${clientData.main_driver_email}`);
    
    if (clientData.main_driver_hotel) {
      doc.text(`${texts.hotel}: ${clientData.main_driver_hotel}`);
    }
    
    doc.moveDown();
    
    // Conducteur additionnel
    if (clientData.has_additional_driver === 'true' || clientData.has_additional_driver === true) {
      doc.fontSize(14).text(texts.additionalDriver, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`${texts.name}: ${clientData.additional_driver_name}`);
      doc.text(`${texts.firstname}: ${clientData.additional_driver_firstname}`);
      doc.text(`${texts.birthDate}: ${clientData.additional_driver_birth_date}`);
      doc.text(`${texts.birthPlace}: ${clientData.additional_driver_birth_place}`);
      doc.text(`${texts.nationality}: ${clientData.additional_driver_nationality || ''}`);
      doc.text(`${texts.licenseNumber}: ${clientData.additional_driver_license_number || ''}`);
      doc.text(`${texts.issueDate}: ${clientData.additional_driver_license_issue_date || ''}`);
      doc.text(`${texts.expiryDate}: ${clientData.additional_driver_license_validity_date || ''}`);
      doc.text(`${texts.issuePlace}: ${clientData.additional_driver_license_issue_place || ''}`);
      
      // Ajouter les images du permis de conduire du conducteur additionnel si disponibles
      if (clientData.additional_driver_license_front_data) {
        doc.moveDown();
        doc.fontSize(10).text(isFrench ? 'Photo du permis (recto):' : 'Driver\'s license photo (front):', { continued: false });
        try {
          doc.image(clientData.additional_driver_license_front_data, {
            fit: [250, 150],
            align: 'center'
          });
        } catch (error) {
          console.error('Erreur lors de l\'ajout de l\'image recto du permis additionnel au PDF:', error);
        }
      }
      
      if (clientData.additional_driver_license_back_data) {
        doc.moveDown();
        doc.fontSize(10).text(isFrench ? 'Photo du permis (verso):' : 'Driver\'s license photo (back):', { continued: false });
        try {
          doc.image(clientData.additional_driver_license_back_data, {
            fit: [250, 150],
            align: 'center'
          });
        } catch (error) {
          console.error('Erreur lors de l\'ajout de l\'image verso du permis additionnel au PDF:', error);
        }
      }
      
      doc.moveDown();
    }
    
    // Carte de crédit principale
    doc.fontSize(14).text(texts.mainCreditCard, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`${texts.cardType}: ${clientData.main_driver_credit_card_type || ''}`);
    doc.text(`${texts.cardNumber}: ${clientData.main_driver_credit_card || ''}`);
    doc.text(`${texts.expiryDate}: ${clientData.main_driver_credit_card_expiry || ''}`);
    doc.text(`${texts.cardHolder}: ${clientData.main_driver_name || ''} ${clientData.main_driver_firstname || ''}`);
    doc.moveDown();
    
    // Carte de crédit supplémentaire
    if (clientData.has_additional_card === 'true' || clientData.has_additional_card === true) {
      doc.fontSize(14).text(texts.additionalCreditCard, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`${texts.cardType}: ${clientData.additional_card_type || ''}`);
      doc.text(`${texts.cardNumber}: ${clientData.additional_card_number || ''}`);
      doc.text(`${texts.expiryDate}: ${clientData.additional_card_expiry_date || ''}`);
      doc.text(`${texts.cardHolder}: ${clientData.additional_card_holder_name || ''}`);
      doc.moveDown();
    }
    
    // Signature
    doc.fontSize(14).text(texts.signature, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`${texts.name}: ${clientData.signature_name}`);
    doc.text(`${texts.date}: ${clientData.signature_date}`);
    doc.moveDown();
    
    // Ajouter la signature si elle existe
    if (clientData.signature_data) {
      try {
        doc.image(clientData.signature_data, {
          fit: [250, 100],
          align: 'center'
        });
      } catch (error) {
        console.error('Erreur lors de l\'ajout de la signature au PDF:', error);
      }
    }
    
    // Finaliser le PDF
    doc.end();
  });
}

// API pour soumettre le formulaire
app.post('/api/submit', async (req, res) => {
  try {
    console.log('Réception d\'une soumission de formulaire');
    const clientData = req.body;
    
    // Vérifier que les données essentielles sont présentes
    if (!clientData.main_driver_name || !clientData.main_driver_firstname) {
      console.error('Données de formulaire incomplètes');
      return res.status(400).json({ error: 'Données de formulaire incomplètes' });
    }
    
    // Générer un ID unique pour le client plus court
    const date = new Date();
    const timestamp = date.getFullYear().toString().slice(-2) + 
                    ('0' + (date.getMonth() + 1)).slice(-2) + 
                    ('0' + date.getDate()).slice(-2) + 
                    ('0' + date.getHours()).slice(-2) + 
                    ('0' + date.getMinutes()).slice(-2);
    const shortUuid = uuidv4().split('-')[0]; // Prendre seulement la première partie de l'UUID
    clientData.id = timestamp + '-' + shortUuid;
    console.log('ID client généré:', clientData.id);
    
    // Générer le PDF
    console.log('Génération du PDF...');
    const pdfPath = await generatePDF(clientData);
    console.log('PDF généré avec succès:', pdfPath);
    
    // Répondre avec succès sans envoyer d'email pour le moment
    console.log('Réponse envoyée au client avec succès');
    res.status(200).json({ 
      message: 'Formulaire traité avec succès',
      id: clientData.id
    });
    
    // SOLUTION DEFINITIVE: Vérifier et créer les colonnes manquantes
    console.log('Préparation de la base de données pour l\'insertion...');
    // Récupérer la structure actuelle de la table
    db.all("PRAGMA table_info(clients)", [], (err, tableInfo) => {
      if (err) {
        console.error('Erreur lors de la récupération de la structure de la table:', err);
        return;
      }
      
      // Créer un ensemble de colonnes existantes
      const existingColumns = new Set(tableInfo.map(col => col.name));
      console.log('Colonnes existantes:', Array.from(existingColumns));
      
      // Identifier les colonnes manquantes
      const missingColumns = Object.keys(clientData).filter(col => !existingColumns.has(col));
      
      if (missingColumns.length > 0) {
        console.log('Colonnes manquantes détectées:', missingColumns);
        
        // Exécuter toutes les requêtes ALTER TABLE de façon séquentielle
        let columnIndex = 0;
        const addNextColumn = () => {
          if (columnIndex >= missingColumns.length) {
            // Toutes les colonnes ont été traitées, insérer les données
            insertClientData(clientData, pdfPath);
            return;
          }
          
          const col = missingColumns[columnIndex];
          const sql = `ALTER TABLE clients ADD COLUMN ${col} TEXT`;
          console.log('Exécution de:', sql);
          
          db.run(sql, (err) => {
            if (err) {
              console.error(`Erreur lors de l'ajout de la colonne ${col}:`, err);
            } else {
              console.log(`Colonne ${col} ajoutée avec succès`);
            }
            
            // Passer à la colonne suivante quoi qu'il arrive
            columnIndex++;
            addNextColumn();
          });
        };
        
        // Démarrer le processus d'ajout de colonnes
        addNextColumn();
      } else {
        // Pas de colonnes manquantes, insérer directement
        insertClientData(clientData, pdfPath);
      }
    });
  } catch (error) {
    console.error('Erreur lors du traitement de la requête:', error);
    res.status(500).json({ error: 'Erreur lors du traitement de la requête' });
  }
});

// Fonction pour insérer les données client
function insertClientData(clientData, pdfPath) {
  console.log('Insertion des données dans la base de données...');
  const placeholders = Object.keys(clientData).map(() => '?').join(',');
  const columns = Object.keys(clientData).join(',');
  const values = Object.values(clientData);
  
  const sql = `INSERT INTO clients (${columns}) VALUES (${placeholders})`;
  
  db.run(sql, values, function(err) {
    if (err) {
      console.error('Erreur lors de l\'insertion dans la base de données:', err.message);
    } else {
      console.log('Données insérées dans la base de données avec succès');
      
      // Tenter d'envoyer l'email en arrière-plan
      try {
        // Configurer le transporteur d'email
        let transporterConfig;
        
        // Vérifier si nous utilisons SendGrid (recommandé pour Render)
        if (process.env.USE_SENDGRID === 'true' && process.env.SENDGRID_API_KEY) {
          // Configuration pour SendGrid
          transporterConfig = {
            service: 'SendGrid',
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY
            }
          };
        } else {
          // Configuration SMTP standard
          transporterConfig = {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            },
            tls: {
              rejectUnauthorized: false
            },
            // Augmenter le délai d'attente pour éviter les timeouts
            connectionTimeout: 60000, // 60 secondes
            greetingTimeout: 30000,   // 30 secondes
            socketTimeout: 60000      // 60 secondes
          };
        }
        
        const transporter = nodemailer.createTransport(transporterConfig);
        
        // Déterminer la langue
        const isFrench = clientData.language === 'fr';
        
        // Textes selon la langue
        const emailTexts = {
          subject: isFrench 
            ? `Nouvelle fiche client - ${clientData.main_driver_name} ${clientData.main_driver_firstname} (ID: ${clientData.id})` 
            : `New client form - ${clientData.main_driver_name} ${clientData.main_driver_firstname} (ID: ${clientData.id})`,
          intro: isFrench 
            ? `Veuillez trouver ci-joint la fiche client de ${clientData.main_driver_name} ${clientData.main_driver_firstname}.` 
            : `Please find attached the client form for ${clientData.main_driver_name} ${clientData.main_driver_firstname}.`,
          clientId: isFrench ? 'ID Client' : 'Client ID',
          name: isFrench ? 'Nom' : 'Name',
          firstname: isFrench ? 'Prénom' : 'Firstname',
          email: 'Email',
          phone: isFrench ? 'Téléphone' : 'Phone',
          submissionDate: isFrench ? 'Date de soumission' : 'Submission date'
        };
        
        // Envoi de l'email
        const mailOptions = {
          // Pour SendGrid, utiliser l'adresse vérifiée comme expéditeur
          from: process.env.USE_SENDGRID === 'true' ? (process.env.SENDGRID_VERIFIED_SENDER || process.env.EMAIL_USER) : process.env.EMAIL_USER,
          to: process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
          subject: emailTexts.subject,
          text: `${emailTexts.intro}

${emailTexts.clientId}: ${clientData.id}
${emailTexts.name}: ${clientData.main_driver_name}
${emailTexts.firstname}: ${clientData.main_driver_firstname}
${emailTexts.email}: ${clientData.main_driver_email}
${emailTexts.phone}: ${clientData.main_driver_phone}
${emailTexts.submissionDate}: ${new Date().toLocaleString()}
`,
          attachments: [
            {
              filename: `${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`,
              path: pdfPath
            }
          ]
        };
        
        // Définir un délai d'expiration pour l'envoi d'email
        const emailTimeout = setTimeout(() => {
          console.error('Erreur lors de l\'envoi de l\'email: Délai d\'expiration dépassé');
          // Ne pas bloquer le processus si l'email échoue
        }, 30000); // 30 secondes de timeout
        
        transporter.sendMail(mailOptions, (error, info) => {
          // Annuler le timeout car la réponse est arrivée
          clearTimeout(emailTimeout);
          
          if (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            // Enregistrer l'erreur dans un fichier de log ou une base de données
            // pour un suivi ultérieur si nécessaire
            console.log('Les données client ont été enregistrées malgré l\'erreur d\'email');
          } else {
            console.log('Email envoyé avec succès:', info.response);
          }
        });
      } catch (emailError) {
        console.error('Erreur lors de la configuration de l\'email:', emailError);
      }
    }
  });
}

// API pour récupérer tous les clients
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY submission_date DESC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des clients:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
    
    res.status(200).json(rows);
  });
});

// API pour récupérer un client par ID
app.get('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM clients WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération du client:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    res.status(200).json(row);
  });
});

// API pour exporter les données au format CSV
app.get('/api/export/csv', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY submission_date DESC', [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des clients:', err.message);
      return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
    }
    
    // Créer le contenu CSV
    const headers = Object.keys(rows[0]).join(',');
    const csvContent = rows.map(row => {
      return Object.values(row).map(value => {
        // Échapper les virgules et les guillemets
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    }).join('\n');
    
    const csv = `${headers}\n${csvContent}`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
    res.status(200).send(csv);
  });
});

// API pour télécharger un PDF
app.get('/api/download-pdf/:id', (req, res) => {
  const clientId = req.params.id;
  
  db.get('SELECT * FROM clients WHERE id = ?', [clientId], async (err, client) => {
    if (err) {
      console.error('Erreur lors de la récupération du client:', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération du client' });
    }
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    try {
      // Regénérer le PDF
      const pdfPath = await generatePDF(client);
      
      // Envoyer le PDF
      res.download(pdfPath, `${client.id}_${client.main_driver_name}_${client.main_driver_firstname}.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
  });
});

// API pour renvoyer un email
app.post('/api/resend-email/:id', (req, res) => {
  const clientId = req.params.id;
  
  db.get('SELECT * FROM clients WHERE id = ?', [clientId], async (err, client) => {
    if (err) {
      console.error('Erreur lors de la récupération du client:', err);
      return res.status(500).json({ error: 'Erreur lors de la récupération du client' });
    }
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    try {
      // Regénérer le PDF
      const pdfPath = await generatePDF(client);
      
      // Configurer le transporteur d'email
      let transporterConfig;
      
      // Vérifier si nous utilisons SendGrid
      if (process.env.USE_SENDGRID === 'true' && process.env.SENDGRID_API_KEY) {
        transporterConfig = {
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        };
      } else {
        transporterConfig = {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        };
      }
      
      const transporter = nodemailer.createTransport(transporterConfig);
      
      // Déterminer la langue
      const isFrench = client.language === 'fr';
      
      // Textes selon la langue
      const emailTexts = {
        subject: isFrench 
          ? `Fiche client - ${client.main_driver_name} ${client.main_driver_firstname} (ID: ${client.id})` 
          : `Client form - ${client.main_driver_name} ${client.main_driver_firstname} (ID: ${client.id})`,
        intro: isFrench 
          ? `Veuillez trouver ci-joint la fiche client de ${client.main_driver_name} ${client.main_driver_firstname}.` 
          : `Please find attached the client form for ${client.main_driver_name} ${client.main_driver_firstname}.`,
        clientId: isFrench ? 'ID Client' : 'Client ID',
        name: isFrench ? 'Nom' : 'Name',
        firstname: isFrench ? 'Prénom' : 'Firstname',
        email: 'Email',
        phone: isFrench ? 'Téléphone' : 'Phone',
        submissionDate: isFrench ? 'Date de soumission' : 'Submission date'
      };
      
      // Envoi de l'email
      const mailOptions = {
        from: process.env.USE_SENDGRID === 'true' ? (process.env.SENDGRID_VERIFIED_SENDER || process.env.EMAIL_USER) : process.env.EMAIL_USER,
        to: process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
        subject: emailTexts.subject,
        text: `${emailTexts.intro}

${emailTexts.clientId}: ${client.id}
${emailTexts.name}: ${client.main_driver_name}
${emailTexts.firstname}: ${client.main_driver_firstname}
${emailTexts.email}: ${client.main_driver_email}
${emailTexts.phone}: ${client.main_driver_phone}
${emailTexts.submissionDate}: ${new Date(client.submission_date).toLocaleString()}
`,
        attachments: [
          {
            filename: `${client.id}_${client.main_driver_name}_${client.main_driver_firstname}.pdf`,
            path: pdfPath
          }
        ]
      };
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Erreur lors de l\'envoi de l\'email:', error);
          return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
        }
        
        console.log('Email renvoyé avec succès:', info.response);
        res.status(200).json({ message: 'Email renvoyé avec succès' });
      });
    } catch (error) {
      console.error('Erreur lors du renvoi de l\'email:', error);
      res.status(500).json({ error: 'Erreur lors du renvoi de l\'email' });
    }
  });
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
