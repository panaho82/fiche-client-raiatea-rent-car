/**
 * Service API Brevo pour RAIATEA RENT CAR
 * 
 * Ce service utilise l'API Brevo plutôt que SMTP pour plus de simplicité
 * et de fiabilité dans l'envoi des emails.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class BrevoApiService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.apiUrl = 'https://api.brevo.com/v3';
    this.defaultSender = {
      email: process.env.BREVO_VERIFIED_SENDER || 'raiatearentcar@mail.pf',
      name: 'RAIATEA RENT CAR'
    };
    this.defaultRecipient = process.env.EMAIL_TO || 'raiatearentcar@mail.pf';
  }

  /**
   * Vérifier la configuration API
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Tester la connexion API
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.apiUrl}/account`, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Générer le template HTML d'email
   */
  generateEmailTemplate(clientData, emailTexts, attachments) {
    const isFrench = clientData.language === 'fr';
    const hasAdditionalDriver = clientData.additional_driver_name && clientData.additional_driver_name.trim() !== '';
    
    // Liste des pièces jointes pour l'affichage
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
            ${new Date().toLocaleString(isFrench ? 'fr-FR' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
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
        <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
          📎 ${isFrench ? 'Pièces jointes incluses' : 'Attached files'} (${attachments.length})
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.6;">
          ${attachmentsList}
        </ul>
        <div style="margin-top: 15px; padding: 12px; background-color: rgba(255,255,255,0.7); border-radius: 4px; font-size: 14px; color: #666;">
          💡 ${isFrench ? 'Toutes les images sont optimisées et sécurisées' : 'All images are optimized and secure'}
        </div>
      </div>
      
      <!-- Informations API -->
      <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 8px; border-left: 4px solid #2196f3;">
        <h4 style="color: #1565c0; margin: 0 0 10px 0; font-size: 16px;">
          🚀 ${isFrench ? 'Envoi via API Brevo' : 'Sent via Brevo API'}
        </h4>
        <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.5;">
          ${isFrench 
            ? 'Cet email a été envoyé via l\'API Brevo pour une fiabilité maximale et une traçabilité complète.'
            : 'This email was sent via Brevo API for maximum reliability and complete traceability.'
          }
        </p>
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
        <p style="margin: 0 0 5px 0;">
          📧 ${isFrench ? 'Envoyé via API Brevo' : 'Sent via Brevo API'}
        </p>
        <p style="margin: 0;">
          ${isFrench 
            ? 'Système de gestion des fiches clients - Version 2.1 API'
            : 'Client management system - Version 2.1 API'
          }
        </p>
      </div>
    </div>
    
  </div>
</body>
</html>`;
    
    return template;
  }

  /**
   * Envoyer un email avec pièces jointes
   */
  async sendEmail(clientData, attachments = []) {
    try {
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

      // Préparer les pièces jointes pour l'API Brevo
      const brevoAttachments = [];
      
      for (const attachment of attachments) {
        if (attachment.path) {
          // Fichier avec chemin (PDF)
          const fileContent = fs.readFileSync(attachment.path);
          const base64Content = fileContent.toString('base64');
          
          brevoAttachments.push({
            name: attachment.filename,
            content: base64Content
          });
        } else if (attachment.content) {
          // Contenu base64 direct (images)
          brevoAttachments.push({
            name: attachment.filename,
            content: attachment.content
          });
        }
      }

      // Générer le template HTML
      const htmlContent = this.generateEmailTemplate(clientData, emailTexts, attachments);
      
      // Préparer les données pour l'API Brevo
      const emailData = {
        sender: this.defaultSender,
        to: [
          {
            email: this.defaultRecipient,
            name: "RAIATEA RENT CAR"
          }
        ],
        subject: emailTexts.subject,
        htmlContent: htmlContent,
        textContent: `${emailTexts.intro}

${emailTexts.clientId}: ${clientData.id}
${emailTexts.name}: ${clientData.main_driver_name}
${emailTexts.firstname}: ${clientData.main_driver_firstname}
${emailTexts.email}: ${clientData.main_driver_email}
${emailTexts.phone}: ${clientData.main_driver_phone}
${emailTexts.submissionDate}: ${new Date().toLocaleString()}

Les photos des permis de conduire sont jointes à cet email.

RAIATEA RENT CAR - Système de gestion des fiches clients`,
        attachment: brevoAttachments
      };

      console.log('=== ENVOI EMAIL API BREVO ===');
      console.log('Destinataire:', this.defaultRecipient);
      console.log('Sujet:', emailTexts.subject);
      console.log('Pièces jointes:', brevoAttachments.length);

      // Envoyer l'email via l'API Brevo
      const response = await axios.post(`${this.apiUrl}/smtp/email`, emailData, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ EMAIL ENVOYÉ AVEC SUCCÈS (API Brevo)');
      console.log('Message ID:', response.data.messageId);
      
      return {
        success: true,
        messageId: response.data.messageId,
        data: response.data
      };

    } catch (error) {
      console.error('❌ ERREUR API BREVO:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Envoyer un email de test
   */
  async sendTestEmail() {
    try {
      const testData = {
        sender: this.defaultSender,
        to: [
          {
            email: this.defaultRecipient,
            name: "RAIATEA RENT CAR"
          }
        ],
        subject: "🎉 Test API Brevo - Configuration fonctionnelle",
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #FFD700, #FFA500); padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #000; margin: 0;">🚗 RAIATEA RENT CAR</h1>
      <p style="color: #333; margin: 5px 0 0 0;">API Brevo - Test réussi !</p>
    </div>
    <div class="content">
      <h2>✅ Configuration API fonctionnelle</h2>
      <p>Votre configuration API Brevo est parfaitement opérationnelle !</p>
      <ul>
        <li><strong>API Key:</strong> Configurée ✅</li>
        <li><strong>Expéditeur:</strong> ${this.defaultSender.email}</li>
        <li><strong>Destinataire:</strong> ${this.defaultRecipient}</li>
        <li><strong>Date du test:</strong> ${new Date().toLocaleString('fr-FR')}</li>
      </ul>
      <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px;">
        <p style="margin: 0; color: #2e7d32;">
          🎉 <strong>Félicitations !</strong> Vos emails seront maintenant envoyés via l'API Brevo, 
          plus fiable que SMTP !
        </p>
      </div>
    </div>
    <div class="footer">
      <p>Test automatique - API Brevo - RAIATEA RENT CAR</p>
    </div>
  </div>
</body>
</html>`,
        textContent: `Test API Brevo - Configuration fonctionnelle

Votre configuration API Brevo est parfaitement opérationnelle !

- API Key: Configurée ✅
- Expéditeur: ${this.defaultSender.email}
- Destinataire: ${this.defaultRecipient}
- Date du test: ${new Date().toLocaleString('fr-FR')}

🎉 Félicitations ! Vos emails seront maintenant envoyés via l'API Brevo, plus fiable que SMTP !

RAIATEA RENT CAR - Système de gestion des fiches clients`,
        attachment: [
          {
            name: "test_api_brevo.txt",
            content: Buffer.from(`Test API Brevo - Configuration réussie !

Date: ${new Date().toLocaleString('fr-FR')}
API Key: Configurée ✅
Expéditeur: ${this.defaultSender.email}
Destinataire: ${this.defaultRecipient}

✅ L'API Brevo est parfaitement configurée.
🚀 Votre système d'emails est prêt à l'emploi !

RAIATEA RENT CAR
Système de gestion des fiches clients - Version API`).toString('base64')
          }
        ]
      };

      console.log('=== TEST API BREVO ===');
      console.log('Envoi email de test...');

      const response = await axios.post(`${this.apiUrl}/smtp/email`, testData, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ EMAIL DE TEST ENVOYÉ AVEC SUCCÈS');
      console.log('Message ID:', response.data.messageId);
      
      return {
        success: true,
        messageId: response.data.messageId,
        data: response.data
      };

    } catch (error) {
      console.error('❌ ERREUR TEST API BREVO:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = BrevoApiService; 