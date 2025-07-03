# Configuration Brevo pour RAIATEA RENT CAR

Ce guide vous explique comment configurer Brevo (ex-Sendinblue) pour l'envoi automatique des emails de votre application.

## 🎯 Avantages de Brevo

- **Plan gratuit généreux** : 300 emails/jour (9000/mois)
- **Interface en français** : Plus facile à utiliser
- **Support francophone** : Assistance en français
- **Coût abordable** : Plans à partir de 25€/mois
- **Excellente délivrabilité** : Vos emails arrivent à destination

## 📋 Étapes de configuration

### 1. Créer un compte Brevo

1. Allez sur [brevo.com](https://brevo.com)
2. Cliquez sur **"Inscription gratuite"**
3. Remplissez le formulaire avec vos informations
4. Confirmez votre email

### 2. Vérifier votre domaine ou email expéditeur

1. Connectez-vous à votre compte Brevo
2. Allez dans **"Expéditeurs et IP"** > **"Expéditeurs"**
3. Cliquez sur **"Ajouter un expéditeur"**
4. Entrez `raiatearentcar@mail.pf`
5. Suivez les instructions pour vérifier l'email

### 3. Générer vos identifiants SMTP

1. Allez dans **"Paramètres"** > **"Clés API et SMTP"**
2. Cliquez sur l'onglet **"SMTP"**  
3. Notez vos identifiants :
   - **Serveur SMTP** : `smtp-relay.brevo.com`
   - **Port** : `587`
   - **Nom d'utilisateur** : Votre email Brevo
   - **Mot de passe** : Cliquez sur "Générer un nouveau mot de passe SMTP"

### 4. Configurer les variables d'environnement

#### Sur Render.com :

1. Allez dans votre dashboard Render
2. Sélectionnez votre service "raiatea-rent-car"
3. Allez dans l'onglet **"Environment"**
4. Modifiez ou ajoutez ces variables :

```
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre_email_brevo@domain.com
EMAIL_PASS=votre_mot_de_passe_smtp_brevo
EMAIL_TO=raiatearentcar@mail.pf
BREVO_VERIFIED_SENDER=raiatearentcar@mail.pf
```

#### En local (fichier .env) :

```bash
# Configuration Brevo
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre_email_brevo@domain.com
EMAIL_PASS=votre_mot_de_passe_smtp_brevo
EMAIL_TO=raiatearentcar@mail.pf
BREVO_VERIFIED_SENDER=raiatearentcar@mail.pf

# Autres paramètres
PORT=3000
```

### 5. Tester la configuration

1. Redémarrez votre application sur Render
2. Testez en soumettant un formulaire client
3. Vérifiez que l'email arrive bien à `raiatearentcar@mail.pf`

## 🔧 Résolution des problèmes courants

### Email non reçu ?

1. **Vérifiez les spams** : L'email peut être dans les indésirables
2. **Vérifiez l'expéditeur** : Assurez-vous que `raiatearentcar@mail.pf` est vérifié dans Brevo
3. **Vérifiez les logs** : Dans Render, consultez les logs pour voir les erreurs

### Erreur d'authentification ?

1. **Régénérez le mot de passe SMTP** dans Brevo
2. **Vérifiez l'email utilisateur** : Utilisez l'email de votre compte Brevo
3. **Vérifiez les variables d'environnement** sur Render

### Quota dépassé ?

- **Plan gratuit** : 300 emails/jour maximum
- **Surveillez votre usage** dans le dashboard Brevo
- **Passez au plan payant** si nécessaire

## 📊 Monitoring avec Brevo

Dans votre dashboard Brevo, vous pouvez :
- **Voir les statistiques** d'envoi
- **Consulter les logs** de livraison  
- **Gérer les retours** (bounces)
- **Suivre l'engagement** (ouvertures, clics)

## 💡 Conseils

1. **Domaine personnalisé** : Pour une meilleure délivrabilité, configurez votre propre domaine
2. **Liste noire** : Évitez d'envoyer à des adresses invalides
3. **Réputation** : Maintenez un bon taux de livraison pour garder une bonne réputation

## 🆘 Support

- **Documentation Brevo** : [help.brevo.com](https://help.brevo.com)
- **Support Brevo** : Via votre dashboard Brevo
- **Chat en ligne** : Disponible en français

---

**Note** : Brevo est une solution fiable et économique, parfaite pour votre application de fiches clients. Avec 300 emails gratuits par jour, vous avez largement de quoi voir venir ! 