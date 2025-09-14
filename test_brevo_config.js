/**
 * Script de test pour la configuration Brevo
 * 
 * Ce script permet de tester la configuration Brevo sans avoir besoin 
 * de démarrer tout le serveur Express.
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// Fonction pour tester la configuration Brevo
async function testBrevoConfig() {
  console.log('🔍 DÉBUT DU TEST BREVO');
  console.log('========================');
  
  // Vérifier les variables d'environnement
  const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_TO'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Assurez-vous d\'avoir un fichier .env avec toutes les variables nécessaires');
    return false;
  }
  
  console.log('✅ Variables d\'environnement trouvées:');
  console.log(`   - EMAIL_HOST: ${process.env.EMAIL_HOST}`);
  console.log(`   - EMAIL_PORT: ${process.env.EMAIL_PORT}`);
  console.log(`   - EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`   - EMAIL_TO: ${process.env.EMAIL_TO}`);
  console.log(`   - BREVO_VERIFIED_SENDER: ${process.env.BREVO_VERIFIED_SENDER || 'Non défini'}`);
  console.log(`   - Mot de passe: ${process.env.EMAIL_PASS ? 'Défini (' + process.env.EMAIL_PASS.length + ' caractères)' : 'Non défini'}`);
  
  // Configuration du transporteur
  const transporterConfig = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // TLS, pas SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    debug: true,
    logger: true
  };
  
  console.log('\n🔧 Configuration du transporteur:');
  console.log(`   - Serveur: ${transporterConfig.host}:${transporterConfig.port}`);
  console.log(`   - Sécurité: ${transporterConfig.secure ? 'SSL' : 'TLS'}`);
  console.log(`   - Authentification: ${transporterConfig.auth.user}`);
  
  try {
    // Créer le transporteur
    console.log('\n📧 Création du transporteur Nodemailer...');
    const transporter = nodemailer.createTransport(transporterConfig);
    
    // Test de vérification
    console.log('🔍 Vérification de la connexion SMTP...');
    await transporter.verify();
    console.log('✅ Connexion SMTP vérifiée avec succès !');
    
    // Template HTML simple pour le test
    const htmlTemplate = `
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
      <p style="color: #333; margin: 5px 0 0 0;">Configuration Brevo - Test réussi !</p>
    </div>
    <div class="content">
      <h2>✅ Configuration fonctionnelle</h2>
      <p>Votre configuration Brevo est correctement paramétrée !</p>
      <ul>
        <li><strong>Serveur SMTP:</strong> ${process.env.EMAIL_HOST}</li>
        <li><strong>Port:</strong> ${process.env.EMAIL_PORT}</li>
        <li><strong>Utilisateur:</strong> ${process.env.EMAIL_USER}</li>
        <li><strong>Date du test:</strong> ${new Date().toLocaleString('fr-FR')}</li>
      </ul>
      <p>🎉 Vous pouvez maintenant utiliser votre système d'emails professionnels !</p>
    </div>
    <div class="footer">
      <p>Test automatique - Système de gestion RAIATEA RENT CAR</p>
    </div>
  </div>
</body>
</html>`;
    
    // Préparer l'email de test
    const mailOptions = {
      from: process.env.BREVO_VERIFIED_SENDER || process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
      to: process.env.EMAIL_TO,
      subject: '🎉 Test Brevo réussi - Configuration fonctionnelle',
      html: htmlTemplate,
      text: `Configuration Brevo testée avec succès !

Date: ${new Date().toLocaleString('fr-FR')}
Serveur: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}
Utilisateur: ${process.env.EMAIL_USER}

✅ Votre configuration Brevo est parfaitement opérationnelle !

RAIATEA RENT CAR - Système de gestion des fiches clients`,
      attachments: [
        {
          filename: 'test_brevo_config.txt',
          content: `Configuration Brevo - Test réussi !
          
Date: ${new Date().toLocaleString('fr-FR')}
Serveur SMTP: ${process.env.EMAIL_HOST}
Port: ${process.env.EMAIL_PORT}
Utilisateur: ${process.env.EMAIL_USER}
Destinataire: ${process.env.EMAIL_TO}

✅ Tous les paramètres sont correctement configurés.
🚀 Votre système d'emails est prêt à l'emploi !

RAIATEA RENT CAR
Système de gestion des fiches clients`
        }
      ]
    };
    
    console.log('\n📩 Envoi de l\'email de test...');
    console.log(`   - De: ${mailOptions.from}`);
    console.log(`   - À: ${mailOptions.to}`);
    console.log(`   - Sujet: ${mailOptions.subject}`);
    
    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('\n🎉 EMAIL ENVOYÉ AVEC SUCCÈS !');
    console.log(`   - Message ID: ${info.messageId}`);
    console.log(`   - Réponse: ${info.response}`);
    
    if (info.accepted && info.accepted.length > 0) {
      console.log(`   - Accepté: ${info.accepted.join(', ')}`);
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.log(`   - Rejeté: ${info.rejected.join(', ')}`);
    }
    
    console.log('\n✅ CONFIGURATION BREVO VALIDÉE !');
    console.log('   Votre système d\'emails est prêt à l\'emploi.');
    console.log('   Vérifiez votre boîte email pour confirmer la réception.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DU TEST :');
    console.error(`   Type: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`   Réponse serveur: ${error.response}`);
    }
    
    // Diagnostics d'erreurs courantes
    console.error('\n🔍 DIAGNOSTIC :');
    
    if (error.message.includes('authentication') || error.message.includes('AUTH')) {
      console.error('   💡 Problème d\'authentification détecté');
      console.error('   → Vérifiez votre EMAIL_USER et EMAIL_PASS');
      console.error('   → Assurez-vous que le mot de passe SMTP est correct');
    }
    
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      console.error('   💡 Problème de timeout détecté');
      console.error('   → Vérifiez votre connexion internet');
      console.error('   → Le serveur Brevo peut être temporairement indisponible');
    }
    
    if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      console.error('   💡 Problème de résolution DNS détecté');
      console.error('   → Vérifiez EMAIL_HOST (doit être smtp-relay.brevo.com)');
      console.error('   → Vérifiez votre connexion internet');
    }
    
    if (error.message.includes('535')) {
      console.error('   💡 Erreur 535 - Authentification rejetée');
      console.error('   → Régénérez votre mot de passe SMTP dans Brevo');
      console.error('   → Vérifiez que l\'expéditeur est vérifié dans Brevo');
    }
    
    return false;
  }
}

// Exécuter le test si le script est appelé directement
if (require.main === module) {
  console.log('🚀 LANCEMENT DU TEST BREVO');
  console.log('===========================\n');
  
  testBrevoConfig()
    .then(success => {
      if (success) {
        console.log('\n🎊 TEST TERMINÉ AVEC SUCCÈS !');
        console.log('Votre configuration Brevo est parfaitement opérationnelle.');
        process.exit(0);
      } else {
        console.log('\n😞 TEST ÉCHOUÉ');
        console.log('Veuillez corriger les erreurs ci-dessus et réessayer.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 ERREUR INATTENDUE :', error);
      process.exit(1);
    });
}

module.exports = { testBrevoConfig }; 