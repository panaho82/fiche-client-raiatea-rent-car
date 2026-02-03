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

    console.log('✅ RÉPONSE RESEND:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.error('❌ ERREUR RESEND API:', data.error);
      return { success: false, error: data.error, method: 'RESEND' };
    }
    
    console.log('✅ EMAIL ENVOYÉ (Resend)', data.id || data.data?.id);
    return { success: true, method: 'RESEND', messageId: data.id || data.data?.id, data };
    
  } catch (error) {
    console.error('❌ ERREUR RESEND EXCEPTION:', error);
    console.error('Stack:', error.stack);
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

// Fonction pour générer le template de confirmation client
function generateClientConfirmationTemplate(clientData) {
  const isFrench = clientData.language === 'fr';
  
  const texts = {
    title: isFrench ? 'Confirmation de votre réservation' : 'Booking Confirmation',
    greeting: isFrench ? 'Bonjour' : 'Hello',
    thank: isFrench 
      ? 'Merci d\'avoir choisi RAIATEA RENT CAR pour votre location de véhicule.' 
      : 'Thank you for choosing RAIATEA RENT CAR for your vehicle rental.',
    received: isFrench
      ? 'Nous avons bien reçu votre fiche client.'
      : 'We have successfully received your client form.',
    attached: isFrench
      ? 'Vous trouverez en pièce jointe un récapitulatif de vos informations.'
      : 'You will find attached a summary of your information.',
    contact: isFrench
      ? 'Notre équipe vous contactera prochainement pour finaliser votre réservation.'
      : 'Our team will contact you soon to finalize your booking.',
    questions: isFrench
      ? 'Pour toute question, n\'hésitez pas à nous contacter.'
      : 'For any questions, please feel free to contact us.',
    regards: isFrench ? 'Cordialement,' : 'Best regards,',
    team: isFrench ? 'L\'équipe RAIATEA RENT CAR' : 'The RAIATEA RENT CAR Team',
    bookingId: isFrench ? 'Numéro de réservation' : 'Booking ID',
    important: isFrench ? 'Important' : 'Important',
    keepEmail: isFrench
      ? 'Conservez cet email, il contient votre numéro de réservation.'
      : 'Keep this email, it contains your booking number.'
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAIATEA RENT CAR - ${texts.title}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; background-color: white; border-radius: 8px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: #000; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);">
        🚗 RAIATEA RENT CAR
      </h1>
      <p style="color: #333; margin: 8px 0 0 0; font-size: 16px; font-weight: 500;">
        ${texts.title}
      </p>
    </div>
    
    <!-- Contenu -->
    <div style="padding: 30px 25px;">
      <p style="font-size: 16px; color: #333; margin: 0 0 10px 0;">
        <strong>${texts.greeting} ${clientData.main_driver_firstname} ${clientData.main_driver_name},</strong>
      </p>
      
      <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 15px 0;">
        ${texts.thank}
      </p>
      
      <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 15px 0;">
        ✅ ${texts.received}
      </p>
      
      <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 15px 0;">
        📄 ${texts.attached}
      </p>
      
      <!-- Numéro de réservation -->
      <div style="margin: 25px 0; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 8px; border-left: 4px solid #2196F3;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #555; font-weight: bold;">
          ${texts.bookingId}
        </p>
        <p style="margin: 0; font-size: 24px; color: #1976d2; font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 1px;">
          ${clientData.id}
        </p>
      </div>
      
      <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 15px 0;">
        ${texts.contact}
      </p>
      
      <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 15px 0;">
        ${texts.questions}
      </p>
      
      <!-- Important -->
      <div style="margin: 25px 0; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>⚠️ ${texts.important}:</strong> ${texts.keepEmail}
        </p>
      </div>
      
      <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 25px 0 5px 0;">
        ${texts.regards}
      </p>
      <p style="font-size: 15px; color: #333; font-weight: bold; margin: 0;">
        ${texts.team}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="margin: 0; font-size: 13px; color: #6c757d; line-height: 1.5;">
        RAIATEA RENT CAR<br>
        📧 raiatearentcar@mail.pf<br>
        🌐 raiatearentcar.com
      </p>
    </div>
    
  </div>
</body>
</html>
  `;
}

// Fonction pour envoyer l'email de confirmation au client
async function sendClientConfirmationEmail(clientData, pdfPath) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY manquant' };
    }
    
    if (!clientData.main_driver_email) {
      return { success: false, error: 'Email client manquant' };
    }

    const isFrench = clientData.language === 'fr';
    const subject = isFrench
      ? `Confirmation de réservation - ${clientData.id}`
      : `Booking confirmation - ${clientData.id}`;

    // Lire le PDF
    const pdfBuffer = fs.readFileSync(pdfPath);

    const htmlContent = generateClientConfirmationTemplate(clientData);
    const fromAddress = process.env.RESEND_FROM || 'noreply@raiatearentcar.com';

    console.log('=== ENVOI EMAIL CONFIRMATION CLIENT ===');
    console.log('From:', fromAddress);
    console.log('To:', clientData.main_driver_email);
    console.log('Subject:', subject);

    const data = await resend.emails.send({
      from: fromAddress,
      to: clientData.main_driver_email,
      subject: subject,
      html: htmlContent,
      attachments: [{
        filename: `Fiche_Client_${clientData.id}.pdf`,
        content: pdfBuffer
      }]
    });

    console.log('✅ RÉPONSE RESEND (Client):', JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.error('❌ ERREUR RESEND API (Client):', data.error);
      return { success: false, error: data.error };
    }
    
    console.log('✅ EMAIL CONFIRMATION CLIENT ENVOYÉ:', data.id || data.data?.id);
    return { success: true, messageId: data.id || data.data?.id, data };
    
  } catch (error) {
    console.error('❌ ERREUR EMAIL CLIENT:', error);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
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

// Fonction de génération PDF - Design complet et professionnel
function generatePDF(clientData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 40,
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
    
    const isFrench = clientData.language === 'fr';
    const pageWidth = doc.page.width - 80;
    
    // Fonction helper pour formater les dates
    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString(isFrench ? 'fr-FR' : 'en-US');
      } catch {
        return dateStr;
      }
    };
    
    // Fonction helper pour afficher un champ avec espacement
    const addField = (label, value, indent = 0) => {
      if (value && value !== 'undefined' && value !== 'null') {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true, indent, lineGap: 4 });
        doc.font('Helvetica').text(value, { lineGap: 4 });
        doc.moveDown(0.3);
      }
    };
    
    // Fonction pour dessiner une ligne de séparation
    const drawLine = () => {
      doc.moveTo(40, doc.y).lineTo(pageWidth + 40, doc.y).stroke('#E6B800');
      doc.moveDown(0.5);
    };
    
    // Fonction pour dessiner un titre de section
    const drawSectionTitle = (title) => {
      doc.moveDown(1);
      const currentY = doc.y;
      doc.rect(40, currentY, pageWidth, 24).fill('#E6B800');
      doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
      doc.text(title, 50, currentY + 6);
      doc.fillColor('#000000');
      doc.y = currentY + 24;
      doc.moveDown(1.2);
    };
    
    // ==================== EN-TÊTE ====================
    doc.rect(0, 0, doc.page.width, 80).fill('#E6B800');
    doc.fillColor('#000000');
    doc.fontSize(28).font('Helvetica-Bold').text('RAIATEA RENT CAR', 0, 25, { align: 'center' });
    doc.fontSize(14).font('Helvetica').text(isFrench ? 'Fiche de Renseignements Client' : 'Client Information Form', 0, 55, { align: 'center' });
    
    doc.fillColor('#000000');
    doc.y = 100;
    
    // ID et Date
    doc.fontSize(10).font('Helvetica');
    doc.text(`ID: ${clientData.id || '-'}`, 40, 100);
    doc.text(`Date: ${formatDate(new Date().toISOString())}`, 0, 100, { align: 'right', width: pageWidth + 40 });
    doc.moveDown(1.5);
    
    // ==================== CONDUCTEUR PRINCIPAL ====================
    drawSectionTitle(isFrench ? 'CONDUCTEUR PRINCIPAL' : 'MAIN DRIVER');
    doc.fontSize(10).font('Helvetica');
    
    // Identité
    addField(isFrench ? 'Nom' : 'Last Name', clientData.main_driver_name);
    addField(isFrench ? 'Prénom' : 'First Name', clientData.main_driver_firstname);
    addField(isFrench ? 'Date de naissance' : 'Birth Date', formatDate(clientData.main_driver_birth_date));
    addField(isFrench ? 'Lieu de naissance' : 'Birth Place', clientData.main_driver_birth_place);
    addField(isFrench ? 'Nationalité' : 'Nationality', clientData.main_driver_nationality);
    doc.moveDown(0.8);
    
    // Passeport
    if (clientData.main_driver_passport) {
      doc.font('Helvetica-Bold').fontSize(10).text(isFrench ? '• Passeport' : '• Passport', { underline: true });
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      addField(isFrench ? 'N° Passeport' : 'Passport No', clientData.main_driver_passport);
      addField(isFrench ? 'Date émission' : 'Issue Date', formatDate(clientData.main_driver_passport_issue_date));
      addField(isFrench ? 'Date expiration' : 'Expiry Date', formatDate(clientData.main_driver_passport_expiry_date));
      doc.moveDown(0.8);
    }
    
    // Permis de conduire
    if (clientData.main_driver_license_number) {
      doc.font('Helvetica-Bold').fontSize(10).text(isFrench ? '• Permis de conduire' : '• Driver License', { underline: true });
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      addField(isFrench ? 'N° Permis' : 'License No', clientData.main_driver_license_number);
      addField(isFrench ? 'Catégorie' : 'Category', clientData.main_driver_license);
      addField(isFrench ? 'Lieu émission' : 'Issue Place', clientData.main_driver_license_issue_place);
      addField(isFrench ? 'Date émission' : 'Issue Date', formatDate(clientData.main_driver_license_issue_date));
      addField(isFrench ? 'Date validité' : 'Validity Date', formatDate(clientData.main_driver_license_validity_date));
      addField(isFrench ? 'Date expiration' : 'Expiry Date', formatDate(clientData.main_driver_license_expiry_date));
      doc.moveDown(0.8);
    }
    
    // Coordonnées
    doc.font('Helvetica-Bold').fontSize(10).text(isFrench ? '• Coordonnées' : '• Contact Details', { underline: true });
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10);
    addField(isFrench ? 'Adresse' : 'Address', clientData.main_driver_address);
    addField(isFrench ? 'Code postal' : 'Postal Code', clientData.main_driver_postal_code);
    addField(isFrench ? 'Ville' : 'City', clientData.main_driver_city);
    addField(isFrench ? 'Pays' : 'Country', clientData.main_driver_country);
    addField(isFrench ? 'Téléphone' : 'Phone', clientData.main_driver_phone);
    addField('Email', clientData.main_driver_email);
    addField(isFrench ? 'Hôtel / Hébergement' : 'Hotel / Accommodation', clientData.main_driver_hotel);
    
    // ==================== CARTE DE CRÉDIT PRINCIPALE ====================
    if (clientData.main_driver_credit_card || clientData.main_card_number) {
      drawSectionTitle(isFrench ? 'CARTE DE CRÉDIT - CONDUCTEUR PRINCIPAL' : 'CREDIT CARD - MAIN DRIVER');
      doc.fontSize(10).font('Helvetica');
      
      addField(isFrench ? 'Type de carte' : 'Card Type', clientData.main_card_type);
      addField(isFrench ? 'Numéro' : 'Card Number', clientData.main_driver_credit_card || clientData.main_card_number);
      addField(isFrench ? 'Date expiration' : 'Expiry Date', clientData.main_driver_credit_card_expiry || clientData.main_card_expiry_date);
      addField(isFrench ? 'Titulaire' : 'Card Holder', clientData.main_card_holder_name);
    }
    
    // ==================== CONDUCTEUR ADDITIONNEL ====================
    if (clientData.has_additional_driver === true || clientData.has_additional_driver === 'true') {
      // Nouvelle page si nécessaire
      if (doc.y > 550) doc.addPage();
      
      drawSectionTitle(isFrench ? 'CONDUCTEUR ADDITIONNEL' : 'ADDITIONAL DRIVER');
      doc.fontSize(10).font('Helvetica');
      
      addField(isFrench ? 'Nom' : 'Last Name', clientData.additional_driver_name);
      addField(isFrench ? 'Prénom' : 'First Name', clientData.additional_driver_firstname);
      addField(isFrench ? 'Date de naissance' : 'Birth Date', formatDate(clientData.additional_driver_birth_date));
      addField(isFrench ? 'Lieu de naissance' : 'Birth Place', clientData.additional_driver_birth_place);
      addField(isFrench ? 'Nationalité' : 'Nationality', clientData.additional_driver_nationality);
      doc.moveDown(0.8);
      
      if (clientData.additional_driver_license_number) {
        doc.font('Helvetica-Bold').fontSize(10).text(isFrench ? '• Permis de conduire' : '• Driver License', { underline: true });
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(10);
        addField(isFrench ? 'N° Permis' : 'License No', clientData.additional_driver_license_number);
        addField(isFrench ? 'Catégorie' : 'Category', clientData.additional_driver_license);
        addField(isFrench ? 'Lieu émission' : 'Issue Place', clientData.additional_driver_license_issue_place);
        addField(isFrench ? 'Date émission' : 'Issue Date', formatDate(clientData.additional_driver_license_issue_date));
        addField(isFrench ? 'Date expiration' : 'Expiry Date', formatDate(clientData.additional_driver_license_expiry_date));
        doc.moveDown(0.8);
      }
      
      doc.font('Helvetica-Bold').fontSize(10).text(isFrench ? '• Coordonnées' : '• Contact Details', { underline: true });
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
      addField(isFrench ? 'Adresse' : 'Address', clientData.additional_driver_address);
      addField(isFrench ? 'Code postal' : 'Postal Code', clientData.additional_driver_postal_code);
      addField(isFrench ? 'Ville' : 'City', clientData.additional_driver_city);
      addField(isFrench ? 'Pays' : 'Country', clientData.additional_driver_country);
      addField(isFrench ? 'Téléphone' : 'Phone', clientData.additional_driver_phone);
      addField('Email', clientData.additional_driver_email);
    }
    
    // ==================== CARTE DE CRÉDIT ADDITIONNELLE ====================
    if ((clientData.has_additional_card === true || clientData.has_additional_card === 'true' || 
         clientData.has_additional_credit_card === true || clientData.has_additional_credit_card === 'true') &&
        (clientData.additional_card_number || clientData.additional_credit_card || clientData.additional_driver_credit_card)) {
      
      if (doc.y > 650) doc.addPage();
      
      drawSectionTitle(isFrench ? 'CARTE DE CRÉDIT ADDITIONNELLE' : 'ADDITIONAL CREDIT CARD');
      doc.fontSize(10).font('Helvetica');
      
      addField(isFrench ? 'Type de carte' : 'Card Type', clientData.additional_card_type);
      addField(isFrench ? 'Numéro' : 'Card Number', clientData.additional_card_number || clientData.additional_credit_card || clientData.additional_driver_credit_card);
      addField(isFrench ? 'Date expiration' : 'Expiry Date', clientData.additional_card_expiry_date || clientData.additional_credit_card_expiry || clientData.additional_driver_credit_card_expiry);
      addField(isFrench ? 'Titulaire' : 'Card Holder', clientData.additional_card_holder_name);
    }
    
    // ==================== ACCEPTATIONS ====================
    if (doc.y > 600) doc.addPage();
    
    drawSectionTitle(isFrench ? 'ACCEPTATIONS ET SIGNATURE' : 'ACCEPTANCES AND SIGNATURE');
    doc.fontSize(10).font('Helvetica');
    
    const checkMark = '✓';
    const crossMark = '✗';
    
    const termsAccepted = clientData.accept_terms === true || clientData.accept_terms === 'true' || clientData.rental_conditions_accepted === true || clientData.rental_conditions_accepted === 'true';
    const dataAccepted = clientData.accept_data_processing === true || clientData.accept_data_processing === 'true';
    
    doc.moveDown(0.3);
    doc.text(`${termsAccepted ? checkMark : crossMark} ${isFrench ? 'Conditions générales de location acceptées' : 'Rental terms and conditions accepted'}`, { lineGap: 6 });
    doc.moveDown(0.5);
    doc.text(`${dataAccepted ? checkMark : crossMark} ${isFrench ? 'Traitement des données personnelles accepté' : 'Personal data processing accepted'}`, { lineGap: 6 });
    doc.moveDown(0.8);
    
    if (clientData.signature_name) {
      addField(isFrench ? 'Signataire' : 'Signatory', clientData.signature_name);
    }
    if (clientData.signature_date) {
      addField(isFrench ? 'Date de signature' : 'Signature Date', formatDate(clientData.signature_date));
    }
    
    // ==================== SIGNATURE ====================
    if (clientData.signature_data) {
      doc.moveDown(1.2);
      doc.fontSize(11).font('Helvetica-Bold').text(isFrench ? 'Signature :' : 'Signature:');
      doc.moveDown(0.8);
      
      try {
        let signatureSource = clientData.signature_data;
        if (typeof signatureSource === 'string' && signatureSource.startsWith('data:image')) {
          const base64Data = signatureSource.split(',')[1];
          if (base64Data) {
            signatureSource = Buffer.from(base64Data, 'base64');
          }
        }
        doc.image(signatureSource, { fit: [200, 100] });
      } catch (error) {
        console.error('Erreur signature PDF:', error);
        doc.fontSize(10).font('Helvetica').text(isFrench ? '(Signature électronique enregistrée)' : '(Electronic signature recorded)');
      }
    }
    
    // ==================== PIED DE PAGE ====================
    doc.moveDown(2);
    drawLine();
    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text(
      `RAIATEA RENT CAR - ${isFrench ? 'Document généré le' : 'Document generated on'} ${new Date().toLocaleString(isFrench ? 'fr-FR' : 'en-US')}`,
      40,
      doc.y,
      { align: 'center', width: pageWidth }
    );
    doc.fillColor('#000000');
    
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
          // Garder le numéro complet pour le PDF
          clientData.main_driver_credit_card = pan;
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
        
        // Envoyer email à la société
        console.log('📧 Envoi email à la société...');
        const emailResult = await sendEmailViaResend(clientData, attachments);
        
        if (emailResult.success) {
          console.log('✅ Email société envoyé:', emailResult.messageId);
        } else {
          console.error('❌ Échec email société:', emailResult.error);
        }
        
        // Envoyer email de confirmation au client
        console.log('📧 Envoi confirmation au client...');
        const clientEmailResult = await sendClientConfirmationEmail(clientData, pdfPath);
        
        if (clientEmailResult.success) {
          console.log('✅ Email confirmation client envoyé:', clientEmailResult.messageId);
        } else {
          console.error('❌ Échec email client:', clientEmailResult.error);
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
