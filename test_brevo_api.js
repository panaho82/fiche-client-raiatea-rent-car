/**
 * Test et diagnostic API Brevo pour RAIATEA RENT CAR
 * 
 * Ce script teste la configuration API Brevo avec diagnostic intelligent
 * des erreurs courantes et suggestions de résolution.
 * 
 * Usage:
 * node test_brevo_api.js
 */

require('dotenv').config();
const axios = require('axios');

class BrevoApiTester {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.apiUrl = 'https://api.brevo.com/v3';
    this.defaultSender = {
      email: process.env.BREVO_VERIFIED_SENDER || process.env.EMAIL_TO || 'raiatearentcar@mail.pf',
      name: 'RAIATEA RENT CAR'
    };
    this.defaultRecipient = process.env.EMAIL_TO || 'raiatearentcar@mail.pf';
  }

  /**
   * Afficher le diagnostic de configuration
   */
  displayConfig() {
    console.log('='.repeat(60));
    console.log('🔍 DIAGNOSTIC CONFIGURATION API BREVO');
    console.log('='.repeat(60));
    
    console.log('\n📋 Variables d\'environnement:');
    console.log('  BREVO_API_KEY:', this.apiKey ? 
      `✅ Définie (${this.apiKey.substring(0, 10)}...)` : 
      '❌ Non définie');
    console.log('  BREVO_VERIFIED_SENDER:', this.defaultSender.email);
    console.log('  EMAIL_TO:', this.defaultRecipient);
    
    console.log('\n🌐 Configuration API:');
    console.log('  URL API:', this.apiUrl);
    console.log('  Expéditeur:', this.defaultSender.email);
    console.log('  Destinataire:', this.defaultRecipient);
    
    if (!this.apiKey) {
      console.log('\n⚠️  PROBLÈME DÉTECTÉ:');
      console.log('  La variable BREVO_API_KEY n\'est pas définie.');
      console.log('\n🔧 SOLUTION:');
      console.log('  1. Connectez-vous à votre compte Brevo');
      console.log('  2. Allez dans SMTP & API > Clés API');
      console.log('  3. Créez une nouvelle clé API');
      console.log('  4. Ajoutez BREVO_API_KEY=votre_clé_api dans votre .env');
      console.log('  5. Redémarrez votre application');
      return false;
    }
    
    return true;
  }

  /**
   * Tester la connexion API
   */
  async testConnection() {
    try {
      console.log('\n🔄 Test de connexion API Brevo...');
      
      const response = await axios.get(`${this.apiUrl}/account`, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log('✅ Connexion API réussie !');
      console.log('  Compte:', response.data.email || 'Non spécifié');
      console.log('  Plan:', response.data.plan?.type || 'Non spécifié');
      console.log('  Emails restants:', response.data.plan?.emailsRemaining || 'Non spécifié');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Erreur de connexion API:');
      
      if (error.response) {
        console.error('  Status:', error.response.status);
        console.error('  Message:', error.response.data?.message || 'Erreur inconnue');
        
        // Diagnostic intelligent des erreurs
        if (error.response.status === 401) {
          console.log('\n🔧 DIAGNOSTIC: Erreur d\'authentification');
          console.log('  Causes possibles:');
          console.log('  - Clé API invalide ou expirée');
          console.log('  - Clé API mal copiée (espaces, caractères manquants)');
          console.log('  - Compte Brevo suspendu');
          console.log('\n💡 SOLUTIONS:');
          console.log('  1. Vérifiez votre clé API dans le dashboard Brevo');
          console.log('  2. Régénérez une nouvelle clé API si nécessaire');
          console.log('  3. Vérifiez que votre compte Brevo est actif');
        } else if (error.response.status === 403) {
          console.log('\n🔧 DIAGNOSTIC: Accès refusé');
          console.log('  Causes possibles:');
          console.log('  - Clé API avec permissions insuffisantes');
          console.log('  - Limite d\'utilisation atteinte');
          console.log('\n💡 SOLUTIONS:');
          console.log('  1. Vérifiez les permissions de votre clé API');
          console.log('  2. Consultez votre quota d\'emails');
        } else if (error.response.status >= 500) {
          console.log('\n🔧 DIAGNOSTIC: Erreur serveur Brevo');
          console.log('  Le service Brevo semble temporairement indisponible.');
          console.log('  Réessayez dans quelques minutes.');
        }
      } else if (error.code === 'ECONNABORTED') {
        console.log('\n🔧 DIAGNOSTIC: Timeout de connexion');
        console.log('  Votre connexion internet semble lente.');
        console.log('  Vérifiez votre connexion et réessayez.');
      } else {
        console.error('  Erreur technique:', error.message);
      }
      
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
      console.log('\n📧 Envoi d\'un email de test...');
      
      const emailData = {
        sender: this.defaultSender,
        to: [
          {
            email: this.defaultRecipient,
            name: "RAIATEA RENT CAR"
          }
        ],
        subject: "🎉 Test API Brevo - Configuration réussie !",
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
    .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #000; margin: 0;">🚗 RAIATEA RENT CAR</h1>
      <p style="color: #333; margin: 5px 0 0 0;">Test API Brevo réussi !</p>
    </div>
    <div class="content">
      <h2>🎉 Félicitations !</h2>
      <p>Votre configuration API Brevo fonctionne parfaitement !</p>
      
      <div class="success">
        <strong>✅ Configuration validée</strong><br>
        Votre système peut maintenant envoyer des emails via l'API Brevo, 
        plus fiable et plus rapide que SMTP !
      </div>
      
      <h3>📊 Détails du test:</h3>
      <ul>
        <li><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</li>
        <li><strong>Expéditeur:</strong> ${this.defaultSender.email}</li>
        <li><strong>Destinataire:</strong> ${this.defaultRecipient}</li>
        <li><strong>Méthode:</strong> API Brevo (recommandée)</li>
      </ul>
      
      <h3>🚀 Prochaines étapes:</h3>
      <p>Votre formulaire client RAIATEA RENT CAR est maintenant prêt à envoyer des emails professionnels avec pièces jointes via l'API Brevo.</p>
    </div>
    <div class="footer">
      <p>Test automatique - API Brevo - RAIATEA RENT CAR<br>
         Système de gestion des fiches clients - Version API</p>
    </div>
  </div>
</body>
</html>`,
        textContent: `🎉 Test API Brevo - Configuration réussie !

Félicitations ! Votre configuration API Brevo fonctionne parfaitement !

✅ Configuration validée
Votre système peut maintenant envoyer des emails via l'API Brevo, 
plus fiable et plus rapide que SMTP !

📊 Détails du test:
- Date: ${new Date().toLocaleString('fr-FR')}
- Expéditeur: ${this.defaultSender.email}
- Destinataire: ${this.defaultRecipient}
- Méthode: API Brevo (recommandée)

🚀 Prochaines étapes:
Votre formulaire client RAIATEA RENT CAR est maintenant prêt à envoyer 
des emails professionnels avec pièces jointes via l'API Brevo.

RAIATEA RENT CAR - Système de gestion des fiches clients - Version API`,
        attachment: [
          {
            name: "test_api_brevo_diagnostic.txt",
            content: Buffer.from(`Test API Brevo - Configuration validée !

Date: ${new Date().toLocaleString('fr-FR')}
Expéditeur: ${this.defaultSender.email}
Destinataire: ${this.defaultRecipient}
Méthode: API Brevo

✅ Toutes les vérifications sont passées avec succès !
🚀 Votre système d'emails est opérationnel.

Configuration testée:
- Connexion API: OK
- Authentification: OK
- Envoi d'email: OK
- Pièces jointes: OK

RAIATEA RENT CAR
Système de gestion des fiches clients - Version API optimisée`).toString('base64')
          }
        ]
      };

      console.log('  Expéditeur:', this.defaultSender.email);
      console.log('  Destinataire:', this.defaultRecipient);
      
      const response = await axios.post(`${this.apiUrl}/smtp/email`, emailData, {
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      console.log('✅ Email de test envoyé avec succès !');
      console.log('  Message ID:', response.data.messageId);
      console.log('  Status:', 'Envoyé');
      
      return {
        success: true,
        messageId: response.data.messageId,
        data: response.data
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du test:');
      
      if (error.response) {
        console.error('  Status:', error.response.status);
        console.error('  Message:', error.response.data?.message || 'Erreur inconnue');
        
        // Diagnostic des erreurs d'envoi
        if (error.response.status === 400) {
          console.log('\n🔧 DIAGNOSTIC: Erreur de données');
          console.log('  Causes possibles:');
          console.log('  - Adresse email expéditeur non vérifiée');
          console.log('  - Format d\'email invalide');
          console.log('  - Données manquantes');
          console.log('\n💡 SOLUTIONS:');
          console.log('  1. Vérifiez l\'adresse expéditeur dans Brevo');
          console.log('  2. Ajoutez et vérifiez votre domaine');
          console.log('  3. Utilisez une adresse email valide');
        } else if (error.response.status === 402) {
          console.log('\n🔧 DIAGNOSTIC: Quota d\'emails atteint');
          console.log('  Votre quota d\'emails gratuits est épuisé.');
          console.log('\n💡 SOLUTIONS:');
          console.log('  1. Attendez le renouvellement mensuel');
          console.log('  2. Ou passez à un plan payant Brevo');
        }
      } else {
        console.error('  Erreur technique:', error.message);
      }
      
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Exécuter tous les tests
   */
  async runAllTests() {
    console.log('🚀 DÉBUT DES TESTS API BREVO');
    console.log('Timestamp:', new Date().toLocaleString('fr-FR'));
    
    // 1. Afficher la configuration
    const configOk = this.displayConfig();
    if (!configOk) {
      console.log('\n❌ ÉCHEC: Configuration incomplète');
      return false;
    }
    
    // 2. Test de connexion
    const connectionResult = await this.testConnection();
    if (!connectionResult.success) {
      console.log('\n❌ ÉCHEC: Impossible de se connecter à l\'API Brevo');
      return false;
    }
    
    // 3. Test d'envoi d'email
    const emailResult = await this.sendTestEmail();
    if (!emailResult.success) {
      console.log('\n❌ ÉCHEC: Impossible d\'envoyer l\'email de test');
      return false;
    }
    
    // Succès complet
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TOUS LES TESTS RÉUSSIS !');
    console.log('='.repeat(60));
    console.log('\n✅ Votre configuration API Brevo est parfaitement opérationnelle !');
    console.log('✅ Vos emails seront envoyés via l\'API Brevo (plus fiable que SMTP)');
    console.log('✅ Consultez votre boîte email pour voir le message de test');
    
    console.log('\n🚀 PROCHAINES ÉTAPES:');
    console.log('  1. Votre formulaire client est prêt à l\'emploi');
    console.log('  2. Les emails seront envoyés automatiquement');
    console.log('  3. Surveillez votre quota dans le dashboard Brevo');
    
    console.log('\n📊 AVANTAGES API BREVO:');
    console.log('  • Plus fiable que SMTP');
    console.log('  • Gestion automatique des erreurs');
    console.log('  • Statistiques d\'envoi détaillées');
    console.log('  • Support des pièces jointes');
    console.log('  • Fallback automatique vers SMTP si nécessaire');
    
    return true;
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  const tester = new BrevoApiTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 ERREUR CRITIQUE:', error);
      process.exit(1);
    });
}

module.exports = BrevoApiTester; 