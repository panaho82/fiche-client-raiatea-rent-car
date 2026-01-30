require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// ==========================
// Configuration PostgreSQL Pool
// ==========================
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'raiatea_db',
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Vérifier la connexion au démarrage
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connecté avec succès');
    client.release();
  } catch (error) {
    console.error('❌ Erreur de connexion PostgreSQL:', error);
    process.exit(1);
  }
})();

// ==========================
// Configuration Resend
// ==========================
const resend = new Resend(process.env.RESEND_API_KEY);

// Derrière un proxy (Dokploy/Traefik), activer trust proxy
app.set('trust proxy', 1);

// ==========================
// Utilitaires carte bancaire
// ==========================
const ALLOW_FULL_CARD = process.env.ALLOW_FULL_CARD === 'true';
const ALLOWED_CARD_BRANDS = (process.env.ALLOWED_CARD_BRANDS || 'visa,mastercard')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function luhnCheck(pan) {
  if (!pan) return false;
  const digits = pan.replace(/\D/g, '');
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function detectBrand(pan) {
  if (!pan) return 'unknown';
  const digits = pan.replace(/\D/g, '');
  if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(digits)) return 'visa';
  if (/^(5[1-5][0-9]{14})$/.test(digits)) return 'mastercard';
  if (/^(2221|222[2-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[0-1][0-9]|2720)[0-9]{12}$/.test(digits)) return 'mastercard';
  if (/^3[47][0-9]{13}$/.test(digits)) return 'amex';
  return 'unknown';
}

function isExpired(yyyyMm) {
  if (!yyyyMm) return true;
  const m = /^([0-9]{4})-([0-9]{2})/.exec(String(yyyyMm));
  if (!m) return true;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  if (mo < 1 || mo > 12) return true;
  const endOfMonth = new Date(y, mo, 0);
  const now = new Date();
  return endOfMonth < new Date(now.getFullYear(), now.getMonth(), 1);
}

// ==========================
// Fonction d'envoi email via Resend
// ==========================
async function sendEmailViaResend(clientData, attachments = []) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY manquant', method: 'RESEND' };
    }

    const isFrench = clientData.language === 'fr';
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

    // Préparer les pièces jointes pour Resend
    const resendAttachments = [];
    for (const att of attachments) {
      if (att.path) {
        const fileContent = fs.readFileSync(att.path);
        resendAttachments.push({ 
          filename: att.filename, 
          content: fileContent 
        });
      } else if (att.content) {
        const buffer = Buffer.from(att.content, 'base64');
        resendAttachments.push({ 
          filename: att.filename, 
          content: buffer 
        });
      }
    }

    const htmlContent = generateEmailTemplate(clientData, emailTexts, attachments);
    const fromAddress = process.env.RESEND_FROM || 'contact@raiatearentcar.com';
    const toAddress = process.env.EMAIL_TO || 'raiatearentcar@mail.pf';

    console.log('=== ENVOI EMAIL VIA RESEND ===');
    console.log('From:', fromAddress);
    console.log('To:', toAddress);
    console.log('Attachments:', resendAttachments.length);

    const data = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject: emailTexts.subject,
      html: htmlContent,
      attachments: resendAttachments
    });

    console.log('✅ EMAIL ENVOYÉ (Resend)', data.id);
    return { success: true, method: 'RESEND', messageId: data.id, data };
    
  } catch (error) {
    console.error('❌ ERREUR RESEND:', error.message);
    return { success: false, error: error.message, method: 'RESEND' };
  }
}

// Fonction pour générer le template HTML d'email professionnel
function generateEmailTemplate(clientData, emailTexts, attachments) {
  const isFrench = clientData.language === 'fr';
  const hasAdditionalDriver = clientData.additional_driver_name && clientData.additional_driver_name.trim() !== '';
  
  let attachmentsList = `
    <li>Fiche client complète (PDF)</li>
    <li>Photos du permis de conduire principal</li>
  `;
  
  if (hasAdditionalDriver) {
    attachmentsList += `<li>Photos du permis conducteur additionnel</li>`;
  }
  
  const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAIATEA RENT CAR - Nouvelle fiche client</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; background-color: white; border-radius: 8px; overflow: hidden;">
    
    <!-- Header avec logo -->
    <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
        🚗 RAIATEA RENT CAR
      </h1>
      <p style="color: #333; margin: 8px 0 0 0; font-size: 16px; font-weight: 500;">
        ${isFrench ? 'Nouvelle fiche client' : 'New client form'}
      </p>
    </div>
    
    <!-- Contenu principal -->
    <div style="padding: 30px 25px; background-color: #fafafa;">
      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px; border-bottom: 2px solid #FFD700; padding-bottom: 8px;">
        👤 ${clientData.main_driver_name} ${clientData.main_driver_firstname}
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; font-weight: bold; color: #555; background-color: #f8f9fa; width: 40%;">
            📋 ${emailTexts.clientId}
          </td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; color: #333; font-family: 'Courier New', monospace; font-weight: bold; color: #007bff;">
            ${clientData.id}
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; font-weight: bold; color: #555; background-color: #f8f9fa;">
            📧 ${emailTexts.email}
          </td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; color: #333;">
            <a href="mailto:${clientData.main_driver_email}" style="color: #007bff; text-decoration: none;">
              ${clientData.main_driver_email}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; font-weight: bold; color: #555; background-color: #f8f9fa;">
            📱 ${emailTexts.phone}
          </td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; color: #333;">
            <a href="tel:${clientData.main_driver_phone}" style="color: #007bff; text-decoration: none;">
              ${clientData.main_driver_phone}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; font-weight: bold; color: #555; background-color: #f8f9fa;">
            🗓️ ${emailTexts.submissionDate}
          </td>
          <td style="padding: 15px 20px; border-bottom: 1px solid #eee; color: #333;">
            ${new Date().toLocaleString(isFrench ? 'fr-FR' : 'en-US')}
          </td>
        </tr>
        ${hasAdditionalDriver ? `
        <tr>
          <td style="padding: 15px 20px; font-weight: bold; color: #555; background-color: #f8f9fa;">
            👥 ${isFrench ? 'Conducteur additionnel' : 'Additional driver'}
          </td>
          <td style="padding: 15px 20px; color: #333;">
            ${clientData.additional_driver_name} ${clientData.additional_driver_firstname}
          </td>
        </tr>` : ''}
      </table>
      
      <!-- Pièces jointes -->
      <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); border-radius: 8px; border-left: 4px solid #28a745;">
        <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 18px;">
          📎 ${isFrench ? 'Pièces jointes incluses' : 'Attached files'} (${attachments.length})
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.6;">
          ${attachmentsList}
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #333; color: white; padding: 25px 20px; text-align: center;">
      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #FFD700;">
          🏝️ RAIATEA RENT CAR
        </h4>
        <p style="margin: 0; font-size: 14px; color: #ccc;">
          ${isFrench ? 'Location de véhicules en Polynésie française' : 'Vehicle rental in French Polynesia'}
        </p>
      </div>
      <div style="border-top: 1px solid #555; padding-top: 15px; font-size: 12px; color: #aaa;">
        <p style="margin: 0;">
          🤖 ${isFrench ? 'Email généré automatiquement - Dokploy' : 'Automatically generated email - Dokploy'}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
  
  return template;
}

// ==========================
// Middleware
// ==========================
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = allowedOrigins.length > 0 ? {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
} : {};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(globalLimiter);
const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/submit', submitLimiter);

// ==========================
// Initialisation de la base de données
// ==========================
(async () => {
  try {
    const connection = await pool.connect();
    
    // Créer la table clients avec MySQL
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(100) PRIMARY KEY,
        language VARCHAR(10),
        
        main_driver_name VARCHAR(255),
        main_driver_firstname VARCHAR(255),
        main_driver_birth_date DATE,
        main_driver_birth_place VARCHAR(255),
        main_driver_nationality VARCHAR(100),
        main_driver_passport VARCHAR(100),
        main_driver_passport_issue_date DATE,
        main_driver_passport_expiry_date DATE,
        main_driver_license VARCHAR(100),
        main_driver_license_number VARCHAR(100),
        main_driver_license_issue_date DATE,
        main_driver_license_validity_date DATE,
        main_driver_license_expiry_date DATE,
        main_driver_license_issue_place VARCHAR(255),
        main_driver_address TEXT,
        main_driver_city VARCHAR(255),
        main_driver_postal_code VARCHAR(20),
        main_driver_country VARCHAR(100),
        main_driver_phone VARCHAR(50),
        main_driver_email VARCHAR(255),
        main_driver_hotel VARCHAR(255),
        
        has_additional_driver BOOLEAN,
        additional_driver_name VARCHAR(255),
        additional_driver_firstname VARCHAR(255),
        additional_driver_birth_date DATE,
        additional_driver_birth_place VARCHAR(255),
        additional_driver_nationality VARCHAR(100),
        additional_driver_phone VARCHAR(50),
        additional_driver_email VARCHAR(255),
        additional_driver_address TEXT,
        additional_driver_postal_code VARCHAR(20),
        additional_driver_city VARCHAR(255),
        additional_driver_country VARCHAR(100),
        additional_driver_license VARCHAR(100),
        additional_driver_license_number VARCHAR(100),
        additional_driver_license_issue_date DATE,
        additional_driver_license_validity_date DATE,
        additional_driver_license_expiry_date DATE,
        additional_driver_license_issue_place VARCHAR(255),
        
        main_driver_credit_card VARCHAR(255),
        main_driver_credit_card_expiry VARCHAR(20),
        main_card_type VARCHAR(50),
        main_card_number VARCHAR(255),
        main_card_expiry_date VARCHAR(20),
        main_card_holder_name VARCHAR(255),
        
        has_additional_credit_card BOOLEAN,
        has_additional_card BOOLEAN,
        additional_credit_card VARCHAR(255),
        additional_credit_card_expiry VARCHAR(20),
        additional_driver_credit_card VARCHAR(255),
        additional_driver_credit_card_expiry VARCHAR(20),
        additional_card_type VARCHAR(50),
        additional_card_number VARCHAR(255),
        additional_card_expiry_date VARCHAR(20),
        additional_card_holder_name VARCHAR(255),
        
        accept_terms BOOLEAN,
        accept_data_processing BOOLEAN,
        signature_date DATE,
        signature_name VARCHAR(255),
        signature_data TEXT,
        
        main_driver_license_front_data TEXT,
        main_driver_license_back_data TEXT,
        additional_driver_license_front_data TEXT,
        additional_driver_license_back_data TEXT,
        
        submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Table clients créée ou déjà existante');
    connection.release();
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table:', error);
  }
})();

// ==========================
// Authentification Basic pour admin
// ==========================
function adminAuth(req, res, next) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) {
    return next();
  }
  const authHeader = req.headers['authorization'] || '';
  const expected = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  if (authHeader === expected) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="RAIATEA-ADMIN"');
  return res.status(401).send('Authentication required');
}

// ==========================
// ROUTES
// ==========================

// Route principale
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Formulaire non disponible');
  }
});

// Route admin
app.get('/admin', adminAuth, (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).send('Interface admin non disponible');
  }
});

// Route de status (health check pour Dokploy)
app.get('/status', async (req, res) => {
  try {
    const connection = await pool.connect();
    await connection.query('SELECT 1');
    connection.release();
    
    res.json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      dokploy: true,
      database: 'connected',
      resend: process.env.RESEND_API_KEY ? 'configured' : 'not configured',
      time: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Fonction de génération PDF (identique à l'original, juste adaptée)
function generatePDF(clientData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    const pdfDir = '/app/pdfs';
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    const pdfPath = `${pdfDir}/${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`;
    const pdfStream = fs.createWriteStream(pdfPath);
    
    pdfStream.on('finish', () => resolve(pdfPath));
    pdfStream.on('error', (err) => reject(err));
    
    doc.pipe(pdfStream);
    
    // Même logique PDF que l'original...
    const isFrench = clientData.language === 'fr';
    
    doc.font('Helvetica').fontSize(12);
    doc.fontSize(20).font('Helvetica-Bold').text('RAIATEA RENT CAR', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(isFrench ? 'Fiche de renseignements client' : 'Client Information Form', { align: 'center' });
    doc.moveDown(1);
    
    doc.fontSize(12).text(`ID: ${clientData.id}`, { align: 'right' });
    doc.moveDown(1.5);
    
    // Conducteur principal
    doc.fontSize(14).font('Helvetica-Bold').text(isFrench ? 'CONDUCTEUR PRINCIPAL' : 'MAIN DRIVER');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`${isFrench ? 'Nom' : 'Name'}: ${clientData.main_driver_name || ''}`);
    doc.text(`${isFrench ? 'Prénom' : 'Firstname'}: ${clientData.main_driver_firstname || ''}`);
    doc.text(`Email: ${clientData.main_driver_email || ''}`);
    doc.text(`${isFrench ? 'Téléphone' : 'Phone'}: ${clientData.main_driver_phone || ''}`);
    doc.moveDown(1);
    
    if (clientData.main_driver_credit_card) {
      doc.fontSize(14).font('Helvetica-Bold').text(isFrench ? 'CARTE DE CRÉDIT' : 'CREDIT CARD');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      doc.text(`${isFrench ? 'Numéro' : 'Number'}: ${clientData.main_driver_credit_card}`);
      doc.text(`${isFrench ? 'Expiration' : 'Expiry'}: ${clientData.main_driver_credit_card_expiry || ''}`);
    }
    
    if (clientData.signature_data) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('SIGNATURE');
      doc.moveDown(0.5);
      try {
        let signatureSource = clientData.signature_data;
        if (typeof signatureSource === 'string' && signatureSource.startsWith('data:image')) {
          const base64Data = signatureSource.split(',')[1];
          if (base64Data) {
            signatureSource = Buffer.from(base64Data, 'base64');
          }
        }
        doc.image(signatureSource, { fit: [300, 150] });
      } catch (error) {
        console.error('Erreur signature PDF:', error);
      }
    }
    
    doc.end();
  });
}

// API pour soumettre le formulaire
app.post('/api/submit', async (req, res) => {
  try {
    console.log('📝 Réception formulaire');
    const clientData = req.body;
    
    if (!clientData.main_driver_name || !clientData.main_driver_firstname) {
      return res.status(400).json({ error: 'Données incomplètes' });
    }
    
    // Générer ID unique
    const date = new Date();
    const timestamp = date.getFullYear().toString().slice(-2) + 
                    ('0' + (date.getMonth() + 1)).slice(-2) + 
                    ('0' + date.getDate()).slice(-2) + 
                    ('0' + date.getHours()).slice(-2) + 
                    ('0' + date.getMinutes()).slice(-2);
    const shortUuid = uuidv4().split('-')[0];
    clientData.id = timestamp + '-' + shortUuid;
    
    console.log('🆔 ID généré:', clientData.id);
    
    // Répondre immédiatement
    res.status(200).json({ 
      message: 'Formulaire traité avec succès',
      id: clientData.id
    });
    
    // Traitement asynchrone
    (async () => {
      try {
        // Validation cartes
        const maskCardNumber = (value) => {
          if (!value || typeof value !== 'string') return value;
          const digits = value.replace(/\D/g, '');
          if (!digits) return value;
          const last4 = digits.slice(-4);
          return `**** **** **** ${last4}`.trim();
        };
        
        if (clientData.main_driver_credit_card) {
          const pan = clientData.main_driver_credit_card.replace(/\s|-/g, '');
          const brand = detectBrand(pan);
          const luhnOk = luhnCheck(pan);
          console.log(`💳 Carte principale: ${brand}, Luhn: ${luhnOk}`);
          clientData.main_driver_credit_card = ALLOW_FULL_CARD ? pan : maskCardNumber(pan);
        }
        
        // Générer PDF
        console.log('📄 Génération PDF...');
        const pdfPath = await generatePDF(clientData);
        console.log('✅ PDF généré:', pdfPath);
        
        // Préparer attachments
        const attachments = [{
          filename: `${clientData.id}_${clientData.main_driver_name}_${clientData.main_driver_firstname}.pdf`,
          path: pdfPath
        }];
        
        if (clientData.main_driver_license_front_data) {
          const frontData = clientData.main_driver_license_front_data.split(',')[1];
          if (frontData) {
            attachments.push({
              filename: `${clientData.id}_permis_recto.jpg`,
              content: frontData
            });
          }
        }
        
        if (clientData.main_driver_license_back_data) {
          const backData = clientData.main_driver_license_back_data.split(',')[1];
          if (backData) {
            attachments.push({
              filename: `${clientData.id}_permis_verso.jpg`,
              content: backData
            });
          }
        }
        
        // Envoyer email
        console.log('📧 Envoi email...');
        const emailResult = await sendEmailViaResend(clientData, attachments);
        
        if (emailResult.success) {
          console.log('✅ Email envoyé:', emailResult.messageId);
        } else {
          console.error('❌ Échec email:', emailResult.error);
        }
        
        // Sauvegarder en base
        console.log('💾 Sauvegarde en base...');
        const connection = await pool.connect();
        
        // Liste blanche des colonnes valides dans la table
        const validColumns = [
          'id', 'language', 'main_driver_name', 'main_driver_firstname', 'main_driver_birth_date',
          'main_driver_birth_place', 'main_driver_nationality', 'main_driver_passport',
          'main_driver_passport_issue_date', 'main_driver_passport_expiry_date',
          'main_driver_license', 'main_driver_license_number', 'main_driver_license_issue_date',
          'main_driver_license_validity_date', 'main_driver_license_expiry_date',
          'main_driver_license_issue_place', 'main_driver_address', 'main_driver_city',
          'main_driver_postal_code', 'main_driver_country', 'main_driver_phone',
          'main_driver_email', 'main_driver_hotel', 'has_additional_driver',
          'additional_driver_name', 'additional_driver_firstname', 'additional_driver_birth_date',
          'additional_driver_birth_place', 'additional_driver_nationality',
          'additional_driver_phone', 'additional_driver_email', 'additional_driver_address',
          'additional_driver_postal_code', 'additional_driver_city', 'additional_driver_country',
          'additional_driver_license', 'additional_driver_license_number',
          'additional_driver_license_issue_date', 'additional_driver_license_validity_date',
          'additional_driver_license_expiry_date', 'additional_driver_license_issue_place',
          'main_driver_credit_card', 'main_driver_credit_card_expiry', 'main_card_type',
          'main_card_number', 'main_card_expiry_date', 'main_card_holder_name',
          'has_additional_credit_card', 'has_additional_card', 'additional_credit_card',
          'additional_credit_card_expiry', 'additional_driver_credit_card',
          'additional_driver_credit_card_expiry', 'additional_card_type',
          'additional_card_number', 'additional_card_expiry_date', 'additional_card_holder_name',
          'accept_terms', 'accept_data_processing', 'signature_date', 'signature_name',
          'signature_data', 'main_driver_license_front_data', 'main_driver_license_back_data',
          'additional_driver_license_front_data', 'additional_driver_license_back_data'
        ];
        
        const fields = Object.keys(clientData).filter(key => validColumns.includes(key));
        const values = fields.map(key => clientData[key]);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(',');
        
        await connection.query(
          `INSERT INTO clients (${fields.join(',')}) VALUES (${placeholders})`,
          values
        );
        
        connection.release();
        console.log('✅ Données sauvegardées');
        
      } catch (error) {
        console.error('❌ Erreur traitement asynchrone:', error);
      }
    })();
    
  } catch (error) {
    console.error('❌ Erreur submit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API récupérer tous les clients
app.get('/api/clients', adminAuth, async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.query('SELECT * FROM clients ORDER BY submission_date DESC');
    connection.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API récupérer un client par ID
app.get('/api/clients/:id', adminAuth, async (req, res) => {
  try {
    const connection = await pool.connect();
    const result = await connection.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    connection.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur récupération client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// API test email
app.get('/test-email', async (req, res) => {
  console.log('🧪 Test email Resend');
  
  try {
    const testData = {
      id: 'TEST-' + Date.now(),
      language: 'fr',
      main_driver_name: 'TEST',
      main_driver_firstname: 'DOKPLOY',
      main_driver_email: process.env.EMAIL_TO,
      main_driver_phone: '+689 40 123 456'
    };
    
    const result = await sendEmailViaResend(testData, []);
    
    if (result.success) {
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Erreur test:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================
// Auto-suppression des données > 30 jours (RGPD)
// ==========================
async function cleanOldData() {
  try {
    const client = await pool.connect();
    const result = await client.query(
      `DELETE FROM clients WHERE submission_date < NOW() - INTERVAL '30 days'`
    );
    client.release();
    
    const deletedCount = result.rowCount || 0;
    console.log(`🗑️  Nettoyage auto: ${deletedCount} enregistrement(s) > 30 jours supprimé(s)`);
  } catch (error) {
    console.error('❌ Erreur nettoyage auto:', error.message);
  }
}

// Exécuter au démarrage
cleanOldData();

// Puis toutes les 24h (86400000 ms)
setInterval(cleanOldData, 24 * 60 * 60 * 1000);

// Démarrer le serveur
app.listen(port, '0.0.0.0', () => {
  console.log('🚀 Serveur RAIATEA RENT CAR démarré');
  console.log(`📍 Port: ${port}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Base: PostgreSQL`);
  console.log(`📧 Email: Resend`);
  console.log(`🗑️  Auto-suppression: 30 jours`);
  console.log(`✅ Prêt pour Dokploy!`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', async () => {
  console.log('👋 Arrêt gracieux...');
  await pool.end();
  process.exit(0);
});
