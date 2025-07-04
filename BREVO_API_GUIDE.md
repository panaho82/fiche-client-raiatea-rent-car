# 🚀 Guide API Brevo - RAIATEA RENT CAR

## 📋 Table des matières
1. [Qu'est-ce que l'API Brevo ?](#quest-ce-que-lapi-brevo)
2. [Avantages de l'API vs SMTP](#avantages-de-lapi-vs-smtp)
3. [Configuration étape par étape](#configuration-étape-par-étape)
4. [Test de la configuration](#test-de-la-configuration)
5. [Dépannage](#dépannage)
6. [Migration depuis SMTP](#migration-depuis-smtp)

---

## 🌟 Qu'est-ce que l'API Brevo ?

L'**API Brevo** est une interface moderne et fiable pour envoyer des emails, alternative au protocole SMTP traditionnel. Elle offre une meilleure stabilité, des fonctionnalités avancées et une gestion d'erreurs améliorée.

### 📊 Limites gratuites Brevo
- **300 emails/jour** (vs 100 chez SendGrid)
- **API calls illimitées** pour les tests
- **Statistiques détaillées** incluses
- **Support français** disponible

---

## 🎯 Avantages de l'API vs SMTP

| Fonctionnalité | API Brevo | SMTP Brevo |
|---------------|-----------|------------|
| **Fiabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Vitesse** | ⚡ Très rapide | 🐌 Plus lent |
| **Gestion d'erreurs** | ✅ Avancée | ❌ Basique |
| **Statistiques** | ✅ Détaillées | ❌ Limitées |
| **Pièces jointes** | ✅ Optimisées | ✅ Standard |
| **Configuration** | 🔧 Simple | 🔧 Complexe |
| **Fallback automatique** | ✅ Vers SMTP | ❌ Non |

---

## 📋 Configuration étape par étape

### Étape 1 : Créer un compte Brevo
1. Rendez-vous sur [brevo.com](https://brevo.com)
2. Créez un compte gratuit
3. Vérifiez votre email

### Étape 2 : Récupérer votre clé API
1. Connectez-vous à votre dashboard Brevo
2. Allez dans **Paramètres** (Settings)
3. Cliquez sur **Clés API** (API Keys)
4. Cliquez sur **Créer une nouvelle clé API**
5. Donnez-lui un nom : `RAIATEA-RENT-CAR-API`
6. Copiez la clé générée (format : `xkeysib-...`)

### Étape 3 : Vérifier votre adresse expéditeur
1. Dans le dashboard Brevo, allez dans **Expéditeurs et IP**
2. Cliquez sur **Ajouter un expéditeur**
3. Ajoutez `raiatearentcar@mail.pf`
4. Suivez le processus de vérification

### Étape 4 : Configurer votre application
1. Copiez le fichier `env.template` vers `.env`
2. Configurez les variables suivantes :

```bash
# Configuration API Brevo (RECOMMANDÉE)
BREVO_API_KEY=xkeysib-votre-clé-api-complète-ici
BREVO_VERIFIED_SENDER=raiatearentcar@mail.pf
EMAIL_TO=raiatearentcar@mail.pf
```

### Étape 5 : Test de la configuration
```bash
node test_brevo_api.js
```

---

## 🧪 Test de la configuration

### Test automatique complet
```bash
# Test avec diagnostic intelligent
node test_brevo_api.js
```

### Test via l'interface web
1. Démarrez votre serveur : `npm start`
2. Ouvrez : `http://localhost:3000/test-email`
3. Vérifiez la réponse JSON

### Test manuel avec curl
```bash
curl -X GET "http://localhost:3000/test-email" \
  -H "Accept: application/json"
```

---

## 🔧 Dépannage

### Erreur 401 : Authentification échouée
```
❌ Erreur 401: Unauthorized
```
**Solutions :**
- Vérifiez que votre clé API est correctement copiée
- Assurez-vous qu'elle commence par `xkeysib-`
- Régénérez une nouvelle clé API si nécessaire

### Erreur 400 : Expéditeur non vérifié
```
❌ Erreur 400: Sender not verified
```
**Solutions :**
- Vérifiez l'adresse dans votre dashboard Brevo
- Utilisez exactement la même adresse que celle vérifiée
- Ajoutez et vérifiez votre domaine complet

### Erreur 402 : Quota dépassé
```
❌ Erreur 402: Daily quota exceeded
```
**Solutions :**
- Attendez le renouvellement quotidien (minuit UTC)
- Passez à un plan payant (25€/mois)

### Erreur de connexion
```
❌ ECONNABORTED: timeout
```
**Solutions :**
- Vérifiez votre connexion internet
- Réessayez dans quelques minutes
- Utilisez le fallback SMTP automatique

---

## 🔄 Migration depuis SMTP

### Si vous utilisez actuellement SMTP
Ajoutez simplement la variable `BREVO_API_KEY` à votre `.env` :

```bash
# Nouvelle configuration (ajoutez cette ligne)
BREVO_API_KEY=xkeysib-votre-clé-api

# Gardez votre configuration SMTP (fallback automatique)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre_email@domain.com
EMAIL_PASS=votre_mot_de_passe_smtp
```

### Comportement avec fallback
1. **API Brevo** : Tentative d'envoi en priorité
2. **SMTP Brevo** : Utilisé automatiquement si API échoue
3. **Logs détaillés** : Affichent quelle méthode est utilisée

---

## 📊 Monitoring et statistiques

### Via le dashboard Brevo
1. Connectez-vous à votre compte Brevo
2. Allez dans **Statistiques** > **Emails**
3. Consultez les données en temps réel

### Via les logs de l'application
```bash
# Logs d'envoi réussi
✅ EMAIL ENVOYÉ AVEC SUCCÈS VIA API BREVO
Message ID: <message-id>

# Logs de fallback
⚠️ API Brevo échouée, passage au SMTP...
✅ EMAIL ENVOYÉ AVEC SUCCÈS VIA SMTP
```

---

## 🚨 Cas d'urgence

### Si l'API Brevo ne fonctionne pas
Le système bascule **automatiquement** vers SMTP. Aucune action requise.

### Si ni l'API ni SMTP ne fonctionnent
1. Vérifiez votre connexion internet
2. Consultez le status de Brevo : [status.brevo.com](https://status.brevo.com)
3. Testez avec : `node test_brevo_api.js`
4. Consultez les logs détaillés

---

## 🎉 Avantages pour RAIATEA RENT CAR

### 📈 Performances améliorées
- **Envoi plus rapide** des fiches clients
- **Moins d'erreurs** de timeout
- **Retry automatique** en cas d'échec

### 🛡️ Fiabilité accrue
- **Double sécurité** : API + SMTP fallback
- **Gestion d'erreurs** intelligente
- **Monitoring** en temps réel

### 💼 Expérience client optimisée
- **Emails professionnels** avec templates HTML
- **Pièces jointes** optimisées
- **Livraison garantie** des fiches

---

## 🔗 Ressources utiles

- [Documentation officielle Brevo API](https://developers.brevo.com/)
- [Dashboard Brevo](https://app.brevo.com/)
- [Guide SMTP Brevo](https://help.brevo.com/hc/en-us/articles/209467485)
- [Status page Brevo](https://status.brevo.com/)

---

## 📞 Support

### Support technique
- **Email** : support@brevo.com
- **Chat** : Disponible dans le dashboard
- **Documentation** : help.brevo.com

### Support local (ce projet)
- Testez avec : `node test_brevo_api.js`
- Consultez les logs détaillés
- Vérifiez le fichier `.env`

---

*Guide créé pour RAIATEA RENT CAR - Système de gestion des fiches clients* 