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
    
    // En-tête
    doc.fontSize(20).text('RAIATEA RENT CAR', { align: 'center' });
    doc.fontSize(16).text('Fiche de renseignements client', { align: 'center' });
    doc.moveDown();
    
    // ID du client
    doc.fontSize(12).text(`ID: ${clientData.id}`, { align: 'right' });
    doc.moveDown();
    
    // Conducteur principal
    doc.fontSize(14).text('Conducteur Principal', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Nom: ${clientData.main_driver_name}`);
    doc.text(`Prénom: ${clientData.main_driver_firstname}`);
    doc.text(`Date de naissance: ${clientData.main_driver_birth_date}`);
    doc.text(`Lieu de naissance: ${clientData.main_driver_birth_place}`);
    doc.text(`Nationalité: ${clientData.main_driver_nationality}`);
    
    if (clientData.main_driver_passport) {
      doc.text(`N° Passeport: ${clientData.main_driver_passport}`);
      doc.text(`Date d'émission: ${clientData.main_driver_passport_issue_date}`);
      doc.text(`Date d'expiration: ${clientData.main_driver_passport_expiry_date}`);
    }
    
    doc.text(`N° Permis de conduire: ${clientData.main_driver_license}`);
    doc.text(`Date d'émission: ${clientData.main_driver_license_issue_date}`);
    doc.text(`Date d'expiration: ${clientData.main_driver_license_expiry_date}`);
    doc.text(`Lieu d'émission: ${clientData.main_driver_license_issue_place}`);
    doc.text(`Adresse: ${clientData.main_driver_address}`);
    doc.text(`Ville: ${clientData.main_driver_city}`);
    doc.text(`Code Postal: ${clientData.main_driver_postal_code}`);
    doc.text(`Pays: ${clientData.main_driver_country}`);
    doc.text(`Téléphone: ${clientData.main_driver_phone}`);
    doc.text(`Email: ${clientData.main_driver_email}`);
    
    if (clientData.main_driver_hotel) {
      doc.text(`Hôtel / Pension / Bateau: ${clientData.main_driver_hotel}`);
    }
    
    doc.moveDown();
    
    // Conducteur additionnel
    if (clientData.has_additional_driver === 'true' || clientData.has_additional_driver === true) {
      doc.fontSize(14).text('Conducteur Additionnel', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Nom: ${clientData.additional_driver_name}`);
      doc.text(`Prénom: ${clientData.additional_driver_firstname}`);
      doc.text(`Date de naissance: ${clientData.additional_driver_birth_date}`);
      doc.text(`Lieu de naissance: ${clientData.additional_driver_birth_place}`);
      doc.text(`Nationalité: ${clientData.additional_driver_nationality}`);
      doc.text(`N° Permis de conduire: ${clientData.additional_driver_license}`);
      doc.text(`Date d'émission: ${clientData.additional_driver_license_issue_date}`);
      doc.text(`Date d'expiration: ${clientData.additional_driver_license_expiry_date}`);
      doc.text(`Lieu d'émission: ${clientData.additional_driver_license_issue_place}`);
      doc.moveDown();
    }
    
    // Carte de crédit principale
    doc.fontSize(14).text('Carte de Crédit Principale', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Type de carte: ${clientData.main_card_type}`);
    doc.text(`Numéro de carte: ${clientData.main_card_number}`);
    doc.text(`Date d'expiration: ${clientData.main_card_expiry_date}`);
    doc.text(`Nom du titulaire: ${clientData.main_card_holder_name}`);
    doc.moveDown();
    
    // Carte de crédit supplémentaire
    if (clientData.has_additional_card === 'true' || clientData.has_additional_card === true) {
      doc.fontSize(14).text('Carte de Crédit Supplémentaire', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Type de carte: ${clientData.additional_card_type}`);
      doc.text(`Numéro de carte: ${clientData.additional_card_number}`);
      doc.text(`Date d'expiration: ${clientData.additional_card_expiry_date}`);
      doc.text(`Nom du titulaire: ${clientData.additional_card_holder_name}`);
      doc.moveDown();
    }
    
    // Signature
    doc.fontSize(14).text('Signature', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Nom: ${clientData.signature_name}`);
    doc.text(`Date: ${clientData.signature_date}`);
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
    
    // Générer un ID unique pour le client
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const uuid = uuidv4();
    clientData.id = timestamp + '_' + uuid;
    console.log('ID client généré:', clientData.id);
    
    try {
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
          
          // Ajouter les colonnes manquantes
          const alterTablePromises = missingColumns.map(col => {
            return new Promise((resolve, reject) => {
              const sql = `ALTER TABLE clients ADD COLUMN ${col} TEXT`;
              console.log('Exécution de:', sql);
              db.run(sql, (err) => {
                if (err) {
                  console.error(`Erreur lors de l'ajout de la colonne ${col}:`, err);
                  reject(err);
                } else {
                  console.log(`Colonne ${col} ajoutée avec succès`);
                  resolve();
                }
              });
            });
          });
          
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
            const transporter = nodemailer.createTransport({
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
            });
            
            // Envoi de l'email
            const mailOptions = {
              from: process.env.EMAIL_USER,
              to: process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
              subject: `Nouvelle fiche client - ${clientData.main_driver_name} ${clientData.main_driver_firstname} (ID: ${clientData.id})`,
              text: `Veuillez trouver ci-joint la fiche client de ${clientData.main_driver_name} ${clientData.main_driver_firstname}.

ID Client: ${clientData.id}
Nom: ${clientData.main_driver_name}
Prénom: ${clientData.main_driver_firstname}
Email: ${clientData.main_driver_email}
Téléphone: ${clientData.main_driver_phone}
Date de soumission: ${new Date().toLocaleString()}
`,
              attachments: [
                {
                  filename: `${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`,
                  path: pdfPath
                }
              ]
            };
            
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('Erreur lors de l\'envoi de l\'email:', error);
              } else {
                console.log('Email envoyé avec succès:', info.response);
              }
            });
          } catch (emailError) {
            console.error('Erreur lors de la configuration de l\'email:', emailError);
          }
        }
      });
    } catch (pdfError) {
      console.error('Erreur lors de la génération du PDF:', pdfError);
      return res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
  } catch (error) {
    console.error('Erreur lors du traitement de la requête:', error);
    res.status(500).json({ error: 'Erreur lors du traitement de la requête' });
  }
});

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

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});
