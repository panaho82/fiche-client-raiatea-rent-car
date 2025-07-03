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
    // Créer un document PDF avec des marges standard
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4' // Format A4 standard pour meilleure compatibilité
    });
    
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
    
    // Fonctions utilitaires simples mais efficaces pour le PDF
    
    // Fonction pour ajouter un champ avec étiquette et valeur
    const addField = (label, value, options = {}) => {
      const { bold = true } = options;
      
      doc.font('Helvetica').fontSize(11).text(label, {
        continued: true
      });
      
      if (bold && value) {
        doc.font('Helvetica-Bold');
      }
      
      doc.text(value || '');
      doc.font('Helvetica');
      doc.moveDown(0.5);
    };
    
    // Fonction pour ajouter un titre de section avec fond coloré
    const addSectionTitle = (text) => {
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.moveDown(0.5);
      const y = doc.y;
      
      // Dessiner le fond du titre
      doc.save();
      doc.fillColor('#f0c808'); // Couleur jaune de RAIATEA RENT CAR
      doc.rect(doc.page.margins.left, y, pageWidth, 22).fill();
      
      // Ajouter le texte du titre
      doc.fillColor('#000000');
      doc.fontSize(14).font('Helvetica-Bold').text(text, doc.page.margins.left + 10, y + 5, { width: pageWidth - 20 });
      doc.restore();
      
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(11);
    };
    
    // Fonction pour créer deux colonnes bien alignées
    const createTwoColumnLayout = (leftTitle, rightTitle, leftItems, rightItems) => {
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const columnWidth = pageWidth / 2 - 10;
      
      // Position de départ
      const startY = doc.y;
      
      // Titre de la colonne gauche
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(leftTitle, { underline: true });
      doc.moveDown(0.5);
      
      // Éléments de la colonne gauche
      doc.font('Helvetica').fontSize(11);
      leftItems.forEach(item => {
        doc.text(`${item.label}: `, {
          continued: true
        });
        doc.font('Helvetica-Bold').text(item.value || '');
        doc.font('Helvetica').moveDown(0.5);
      });
      
      // Sauvegarder la position Y après la colonne gauche
      const leftEndY = doc.y;
      
      // Titre de la colonne droite
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(rightTitle, doc.page.margins.left + columnWidth + 20, startY, { underline: true });
      doc.moveDown(0.5);
      
      // Position pour les éléments de la colonne droite
      let rightY = startY + doc.currentLineHeight() * 1.5;
      
      // Éléments de la colonne droite
      doc.font('Helvetica').fontSize(11);
      rightItems.forEach(item => {
        doc.text(`${item.label}: `, doc.page.margins.left + columnWidth + 20, rightY, {
          continued: true
        });
        doc.font('Helvetica-Bold').text(item.value || '');
        doc.font('Helvetica');
        rightY += doc.currentLineHeight() * 1.5;
      });
      
      // Revenir à la position la plus basse entre les deux colonnes
      doc.y = Math.max(leftEndY, rightY);
      doc.moveDown(0.5);
    };
    
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
      date: isFrench ? 'Date' : 'Date',
      vehicleInformation: isFrench ? 'Informations du Véhicule' : 'Vehicle Information',
      pickupDate: isFrench ? 'Date de prise en charge' : 'Pickup date',
      returnDate: isFrench ? 'Date de retour' : 'Return date',
      pickupLocation: isFrench ? 'Lieu de prise en charge' : 'Pickup location',
      returnLocation: isFrench ? 'Lieu de retour' : 'Return location',
      vehicleCategory: isFrench ? 'Catégorie de véhicule' : 'Vehicle category',
      driverLicense: isFrench ? 'Permis de conduire' : 'Driver\'s License',
      addressInfo: isFrench ? 'Adresse' : 'Address'
    };
    
    //=====================================
    // PREMIÈRE PAGE - CONDUCTEUR ET VÉHICULE
    //=====================================
    
    // Police et taille de base
    doc.font('Helvetica').fontSize(12);
    
    // En-tête avec titre
    doc.fontSize(20).font('Helvetica-Bold').text('RAIATEA RENT CAR', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(texts.title, { align: 'center' });
    doc.moveDown(1);
    
    // Date et ID
    const today = new Date().toLocaleDateString(isFrench ? 'fr-FR' : 'en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    
    // Date à gauche
    doc.fontSize(12).font('Helvetica').text(today, { align: 'left' });
    
    // ID à droite sur la même ligne
    const idText = `ID: ${clientData.id}`;
    const idWidth = doc.widthOfString(idText);
    doc.text(idText, doc.page.width - doc.page.margins.right - idWidth, doc.y - doc.currentLineHeight());
    
    doc.moveDown(1.5);
    
    // Titre Conducteur Principal
    addSectionTitle(texts.mainDriver);
    
    // Liste des champs pour le conducteur principal
    const mainDriverFields = [
      { label: texts.name, value: clientData.main_driver_name },
      { label: texts.firstname, value: clientData.main_driver_firstname },
      { label: texts.birthDate, value: clientData.main_driver_birth_date },
      { label: texts.birthPlace, value: clientData.main_driver_birth_place },
      { label: texts.nationality, value: clientData.main_driver_nationality || '' },
      { label: texts.phone, value: clientData.main_driver_phone },
      { label: texts.email, value: clientData.main_driver_email }
    ];
    
    // Afficher les informations du conducteur principal
    mainDriverFields.forEach(field => {
      addField(`${field.label}: `, field.value);
    });
    
    // Titre du permis de conduire
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text(texts.driverLicense, { underline: true });
    doc.moveDown(0.5);
    
    // Liste des champs pour le permis de conduire
    const licenseFields = [
      { label: texts.licenseNumber, value: clientData.main_driver_license_number || '' },
      { label: texts.issueDate, value: clientData.main_driver_license_issue_date || '' },
      { label: texts.expiryDate, value: clientData.main_driver_license_validity_date || '' },
      { label: texts.issuePlace, value: clientData.main_driver_license_issue_place || '' }
    ];
    
    // Afficher les informations du permis
    licenseFields.forEach(field => {
      addField(`${field.label}: `, field.value);
    });
    
    // Note sur les photos du permis
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Oblique').text(isFrench ? 'Note: Les photos du permis de conduire sont jointes séparément à l\'email.' : 'Note: Driver\'s license photos are attached separately to the email.');
    doc.moveDown(0.5);
    
    // Titre Adresse
    doc.fontSize(12).font('Helvetica-Bold').text(texts.addressInfo, { underline: true });
    doc.moveDown(0.5);
    
    // Liste des champs pour l'adresse
    const addressFields = [
      { label: texts.address, value: clientData.main_driver_address },
      { label: texts.city, value: clientData.main_driver_city },
      { label: texts.postalCode, value: clientData.main_driver_postal_code },
      { label: texts.country, value: clientData.main_driver_country }
    ];
    
    // Ajouter hôtel si présent
    if (clientData.main_driver_hotel) {
      addressFields.push({ label: texts.hotel, value: clientData.main_driver_hotel });
    }
    
    // Afficher les informations d'adresse
    addressFields.forEach(field => {
      addField(`${field.label}: `, field.value);
    });
    
    // Titre Informations du Véhicule
    doc.moveDown(1);
    addSectionTitle(texts.vehicleInformation);
    
    // Liste des champs pour le véhicule
    const vehicleFields = [
      { label: texts.pickupDate, value: clientData.pickup_date || '' },
      { label: texts.returnDate, value: clientData.return_date || '' },
      { label: texts.pickupLocation, value: clientData.pickup_location || '' },
      { label: texts.returnLocation, value: clientData.return_location || '' },
      { label: texts.vehicleCategory, value: clientData.vehicle_category || '' }
    ];
    
    // Afficher les informations du véhicule
    vehicleFields.forEach(field => {
      addField(`${field.label}: `, field.value);
    });
    
    // Ajouter une deuxième page pour les cartes de crédit et la signature
    doc.addPage();
    
    //=====================================
    // DEUXIÈME PAGE - CARTES ET SIGNATURE
    //=====================================
    
    // Réafficher l'en-tête sur la deuxième page
    doc.fontSize(20).font('Helvetica-Bold').text('RAIATEA RENT CAR', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(texts.title, { align: 'center' });
    
    // ID sur la deuxième page pour référence
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text(idText, { align: 'right' });
    doc.moveDown(1.5);
    
    // Conducteur additionnel (si présent)
    if (clientData.has_additional_driver === 'true' || clientData.has_additional_driver === true) {
      // Titre du conducteur additionnel
      addSectionTitle(texts.additionalDriver);
      
      // Liste des champs pour le conducteur additionnel
      const additionalDriverFields = [
        { label: texts.name, value: clientData.additional_driver_name },
        { label: texts.firstname, value: clientData.additional_driver_firstname },
        { label: texts.birthDate, value: clientData.additional_driver_birth_date },
        { label: texts.birthPlace, value: clientData.additional_driver_birth_place },
        { label: texts.nationality, value: clientData.additional_driver_nationality || '' }
      ];
      
      // Afficher les informations du conducteur additionnel
      additionalDriverFields.forEach(field => {
        addField(`${field.label}: `, field.value);
      });
      
      // Titre du permis de conduire additionnel
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold').text(texts.driverLicense, { underline: true });
      doc.moveDown(0.5);
      
      // Liste des champs pour le permis de conduire additionnel
      const additionalLicenseFields = [
        { label: texts.licenseNumber, value: clientData.additional_driver_license_number || '' },
        { label: texts.issueDate, value: clientData.additional_driver_license_issue_date || '' },
        { label: texts.expiryDate, value: clientData.additional_driver_license_validity_date || '' },
        { label: texts.issuePlace, value: clientData.additional_driver_license_issue_place || '' }
      ];
      
      // Afficher les informations du permis additionnel
      additionalLicenseFields.forEach(field => {
        addField(`${field.label}: `, field.value);
      });
      
      // Note sur les photos du permis additionnel
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique').text(isFrench ? 'Note: Les photos du permis de conduire sont jointes séparément à l\'email.' : 'Note: Driver\'s license photos are attached separately to the email.');
      doc.moveDown(0.5);
    }
    
    // Carte de crédit principale - titre avec fond jaune
    addSectionTitle(texts.mainCreditCard);
    
    // Liste des champs pour la carte de crédit principale
    const mainCardFields = [
      { label: texts.cardType, value: clientData.main_driver_credit_card_type || '' },
      { label: texts.cardNumber, value: clientData.main_driver_credit_card || '' },
      { label: texts.expiryDate, value: clientData.main_driver_credit_card_expiry || '' },
      { label: texts.cardHolder, value: `${clientData.main_driver_name || ''} ${clientData.main_driver_firstname || ''}` }
    ];
    
    // Afficher les informations de la carte principale
    mainCardFields.forEach(field => {
      addField(`${field.label}: `, field.value);
    });
    
    // Carte de crédit additionnelle (si présente)
    if (clientData.has_additional_card === 'true' || clientData.has_additional_card === true) {
      doc.moveDown(0.5);
      addSectionTitle(texts.additionalCreditCard);
      
      // Liste des champs pour la carte de crédit additionnelle
      const additionalCardFields = [
        { label: texts.cardType, value: clientData.additional_card_type || '' },
        { label: texts.cardNumber, value: clientData.additional_card_number || '' },
        { label: texts.expiryDate, value: clientData.additional_card_expiry_date || '' },
        { label: texts.cardHolder, value: clientData.additional_card_holder_name || '' }
      ];
      
      // Afficher les informations de la carte additionnelle
      additionalCardFields.forEach(field => {
        addField(`${field.label}: `, field.value);
      });
    }
    
    // Section signature
    if (clientData.signature_data) {
      doc.moveDown(1);
      
      // Titre de la signature
      addSectionTitle(texts.signature);
      
      try {
        // Centrer la signature sur la page
        doc.image(clientData.signature_data, {
          fit: [300, 150],
          align: 'center'
        });
        
        // Ajouter la date sous la signature
        doc.moveDown(1);
        const signatureDate = new Date().toLocaleDateString(isFrench ? 'fr-FR' : 'en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // Ajouter une ligne horizontale pour la signature
        const lineWidth = 200;
        const lineX = (doc.page.width - lineWidth) / 2;
        const lineY = doc.y;
        
        doc.moveTo(lineX, lineY)
           .lineTo(lineX + lineWidth, lineY)
           .lineWidth(1)
           .stroke();
        
        // Ajouter la date centrée sous la ligne
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').text(`${texts.date}: ${signatureDate}`, {
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
    
    // Répondre immédiatement au client pour éviter le blocage de l'interface
    console.log('Envoi de la réponse au client...');
    res.status(200).json({ 
      message: 'Formulaire traité avec succès',
      id: clientData.id
    });
    console.log('Réponse envoyée au client avec succès');
    
    // Optimiser les images avant de générer le PDF
    console.log('Optimisation des images...');
    // Fonction pour optimiser les images base64
    const optimizeBase64Image = (base64String) => {
      if (!base64String) return null;
      try {
        // Vérifier si c'est une image valide
        if (!base64String.startsWith('data:image')) {
          return base64String;
        }
        return base64String;
      } catch (error) {
        console.error('Erreur lors de l\'optimisation de l\'image:', error);
        return base64String;
      }
    };
    
    // Optimiser les images du permis de conduire
    if (clientData.main_driver_license_front_data) {
      clientData.main_driver_license_front_data = optimizeBase64Image(clientData.main_driver_license_front_data);
    }
    if (clientData.main_driver_license_back_data) {
      clientData.main_driver_license_back_data = optimizeBase64Image(clientData.main_driver_license_back_data);
    }
    if (clientData.additional_driver_license_front_data) {
      clientData.additional_driver_license_front_data = optimizeBase64Image(clientData.additional_driver_license_front_data);
    }
    if (clientData.additional_driver_license_back_data) {
      clientData.additional_driver_license_back_data = optimizeBase64Image(clientData.additional_driver_license_back_data);
    }
    
    // Générer le PDF
    console.log('Génération du PDF...');
    const pdfPath = await generatePDF(clientData);
    console.log('PDF généré avec succès:', pdfPath);
    
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
        console.log('=== DÉBUT CONFIGURATION EMAIL ===');
        console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
        console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_TO:', process.env.EMAIL_TO);
        console.log('Mot de passe SMTP défini:', process.env.EMAIL_PASS ? 'OUI' : 'NON');
        
        // Configurer le transporteur d'email
        let transporterConfig;
        
        // Vérifier si nous utilisons SendGrid (recommandé pour Render)
        if (process.env.USE_SENDGRID === 'true' && process.env.SENDGRID_API_KEY) {
          console.log('Utilisation de SendGrid...');
          // Configuration pour SendGrid
          transporterConfig = {
            service: 'SendGrid',
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY
            }
          };
        } else {
          console.log('Utilisation de la configuration SMTP standard...');
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
        
        console.log('Configuration du transporteur créée');
        const transporter = nodemailer.createTransport(transporterConfig);
        
        // Vérifier la configuration SMTP
        console.log('Test de la connexion SMTP...');
        transporter.verify(function(error, success) {
          if (error) {
            console.error('ERREUR DE VERIFICATION SMTP:', error);
          } else {
            console.log('SMTP - Serveur prêt à recevoir les emails');
          }
        });
        
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
        
        console.log('Sujet de l\'email:', emailTexts.subject);
        
        // Préparer les pièces jointes pour l'email
        const attachments = [
          {
            filename: `${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`,
            path: pdfPath
          }
        ];
        
        console.log('Nombre de pièces jointes:', attachments.length);
        
        // Ajouter les photos du permis de conduire en pièces jointes si disponibles
        if (clientData.main_driver_license_front_data) {
          const frontImageData = clientData.main_driver_license_front_data.split(',')[1];
          if (frontImageData) {
            attachments.push({
              filename: `${clientData.id}_permis_conducteur_principal_recto.jpg`,
              content: frontImageData,
              encoding: 'base64'
            });
            console.log('Photo permis recto ajoutée');
          }
        }
        
        if (clientData.main_driver_license_back_data) {
          const backImageData = clientData.main_driver_license_back_data.split(',')[1];
          if (backImageData) {
            attachments.push({
              filename: `${clientData.id}_permis_conducteur_principal_verso.jpg`,
              content: backImageData,
              encoding: 'base64'
            });
            console.log('Photo permis verso ajoutée');
          }
        }
        
        // Ajouter les photos du permis du conducteur additionnel si disponibles
        if (clientData.additional_driver_license_front_data) {
          const frontImageData = clientData.additional_driver_license_front_data.split(',')[1];
          if (frontImageData) {
            attachments.push({
              filename: `${clientData.id}_permis_conducteur_additionnel_recto.jpg`,
              content: frontImageData,
              encoding: 'base64'
            });
            console.log('Photo permis additionnel recto ajoutée');
          }
        }
        
        if (clientData.additional_driver_license_back_data) {
          const backImageData = clientData.additional_driver_license_back_data.split(',')[1];
          if (backImageData) {
            attachments.push({
              filename: `${clientData.id}_permis_conducteur_additionnel_verso.jpg`,
              content: backImageData,
              encoding: 'base64'
            });
            console.log('Photo permis additionnel verso ajoutée');
          }
        }
        
        console.log('Total des pièces jointes:', attachments.length);
        
        // Envoi de l'email
        const mailOptions = {
          // Pour Brevo, utiliser l'adresse vérifiée comme expéditeur
          from: process.env.BREVO_VERIFIED_SENDER || process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
          to: process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
          subject: emailTexts.subject,
          text: `${emailTexts.intro}

${emailTexts.clientId}: ${clientData.id}
${emailTexts.name}: ${clientData.main_driver_name}
${emailTexts.firstname}: ${clientData.main_driver_firstname}
${emailTexts.email}: ${clientData.main_driver_email}
${emailTexts.phone}: ${clientData.main_driver_phone}
${emailTexts.submissionDate}: ${new Date().toLocaleString()}

Les photos des permis de conduire sont jointes à cet email.
`,
          attachments: attachments
        };
        
        console.log('=== OPTIONS EMAIL ===');
        console.log('De:', mailOptions.from);
        console.log('À:', mailOptions.to);
        console.log('Sujet:', mailOptions.subject);
        console.log('=== DÉBUT ENVOI EMAIL ===');
        
        // Définir un délai d'expiration pour l'envoi d'email
        const emailTimeout = setTimeout(() => {
          console.error('ERREUR: Délai d\'expiration dépassé pour l\'envoi d\'email (30 secondes)');
        }, 30000); // 30 secondes de timeout
        
        transporter.sendMail(mailOptions, (error, info) => {
          // Annuler le timeout car la réponse est arrivée
          clearTimeout(emailTimeout);
          
          if (error) {
            console.error('=== ERREUR ENVOI EMAIL ===');
            console.error('Type d\'erreur:', error.name);
            console.error('Message d\'erreur:', error.message);
            console.error('Code d\'erreur:', error.code);
            console.error('Commande:', error.command);
            console.error('Réponse du serveur:', error.response);
            console.error('Stack trace:', error.stack);
            console.error('=== FIN ERREUR EMAIL ===');
          } else {
            console.log('=== EMAIL ENVOYÉ AVEC SUCCÈS ===');
            console.log('Response:', info.response);
            console.log('Message ID:', info.messageId);
            console.log('Accepted:', info.accepted);
            console.log('Rejected:', info.rejected);
            console.log('=== FIN SUCCÈS EMAIL ===');
          }
        });
      } catch (emailError) {
        console.error('=== ERREUR CONFIGURATION EMAIL ===');
        console.error('Erreur lors de la configuration de l\'email:', emailError);
        console.error('Stack trace:', emailError.stack);
        console.error('=== FIN ERREUR CONFIGURATION ===');
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
        from: process.env.BREVO_VERIFIED_SENDER || process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
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

// Route de test pour l'envoi d'email
app.get('/test-email', (req, res) => {
  console.log('=== TEST EMAIL DEMANDÉ ===');
  console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_TO:', process.env.EMAIL_TO);
  console.log('BREVO_VERIFIED_SENDER:', process.env.BREVO_VERIFIED_SENDER);
  console.log('Mot de passe défini:', process.env.EMAIL_PASS ? 'OUI' : 'NON');
  console.log('Longueur mot de passe:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
  
  // Configuration du transporteur
  const transporterConfig = {
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
  
  console.log('Création du transporteur...');
  const transporter = nodemailer.createTransport(transporterConfig);
  
  // Test de vérification de la connexion
  console.log('Test de vérification SMTP...');
  transporter.verify(function(error, success) {
    if (error) {
      console.error('ÉCHEC VÉRIFICATION SMTP:', error);
      return res.status(500).json({ 
        error: 'Échec de vérification SMTP', 
        details: error.message,
        code: error.code 
      });
    } else {
      console.log('SUCCÈS VÉRIFICATION SMTP - Serveur prêt');
      
      // Si la vérification réussit, envoyer l'email de test
      sendTestEmail(transporter, res);
    }
  });
});

  // Email de test simple
  const mailOptions = {
    from: process.env.BREVO_VERIFIED_SENDER || process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
    to: process.env.EMAIL_TO,
    subject: 'TEST - Configuration Brevo fonctionnelle',
    text: `Ceci est un email de test pour vérifier la configuration Brevo.

Date: ${new Date().toLocaleString()}
Serveur: ${process.env.EMAIL_HOST}
Port: ${process.env.EMAIL_PORT}

Si vous recevez cet email, la configuration Brevo fonctionne parfaitement !

RAIATEA RENT CAR - Système de formulaires`
  };
  
  console.log('Envoi de l\'email de test...');
  console.log('De:', mailOptions.from);
  console.log('À:', mailOptions.to);
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('ERREUR ENVOI EMAIL TEST:', error);
      res.status(500).json({ 
        error: 'Erreur lors de l\'envoi du test', 
        details: error.message,
        code: error.code
      });
    } else {
      console.log('SUCCÈS ENVOI EMAIL TEST:', info.response);
      res.json({ 
        success: true, 
        message: 'Email de test envoyé avec succès',
        messageId: info.messageId,
        response: info.response
      });
    }
  });
}

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
