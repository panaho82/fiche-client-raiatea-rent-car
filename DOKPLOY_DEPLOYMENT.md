# 🚀 Guide de Déploiement Dokploy - RAIATEA RENT CAR

## 📋 Vue d'ensemble

Ce guide vous accompagne pas à pas pour déployer l'application de fiches clients sur **Dokploy** avec MySQL et Resend.

---

## ✅ Prérequis

### Avant de commencer, vous devez avoir :

1. ✅ **Serveur Ubuntu avec Dokploy installé**
   - IP: `62.146.172.163`
   - Dokploy UI accessible via: `https://dokploy.raiatearentcar.com` (ou IP:3000)

2. ✅ **Compte Resend configuré**
   - Compte créé sur [resend.com](https://resend.com)
   - Domaine vérifié: `raiatearentcar.com`
   - API Key générée

3. ✅ **Domaine configuré**
   - `form.raiatearentcar.com` pointant vers `62.146.172.163`
   - Record A configuré chez votre registrar

4. ✅ **Repository GitHub**
   - Code pushé sur GitHub
   - Branche principale: `main` ou `master`

---

## 🗄️ Étape 1 : Créer la base de données MySQL

### Via l'interface Dokploy :

1. **Connectez-vous à Dokploy** : `http://62.146.172.163:3000`

2. **Créer un nouveau projet** :
   - Cliquez sur `New Project`
   - Nom: `raiatea-rent-car`
   - Description: Application de gestion des fiches clients

3. **Créer le service MySQL** :
   - Dans le projet, cliquez `Add Service` → `Database` → `MySQL`
   - **Configuration** :
     ```
     Service Name: raiatea-mysql
     MySQL Version: 8.0
     Root Password: [générer un mot de passe fort]
     Database Name: raiatea_db
     Username: raiatea
     Password: [générer un mot de passe fort]
     Port: 3306 (par défaut)
     ```

4. **Sauvegarder et démarrer** le service MySQL

5. **Noter les identifiants** :
   ```bash
   DB_HOST=raiatea-mysql  # ou l'IP interne Docker
   DB_USER=raiatea
   DB_PASSWORD=[le mot de passe généré]
   DB_NAME=raiatea_db
   DB_PORT=3306
   ```

---

## 🔧 Étape 2 : Créer l'application Node.js

### Via l'interface Dokploy :

1. **Dans le même projet**, cliquez `Add Service` → `Application`

2. **Configuration Source** :
   ```
   Type: Git (GitHub)
   Repository URL: https://github.com/votre-username/fiche-client-raiatea-rent-car
   Branch: main
   ```

3. **Configuration Build** :
   ```
   Build Type: Dockerfile
   Dockerfile Path: ./Dockerfile (racine)
   Build Context: ./
   ```

4. **Configuration Runtime** :
   ```
   Service Name: raiatea-app
   Port: 3000
   ```

5. **Variables d'environnement** (cliquez sur `Environment Variables`) :

   ```bash
   # Application
   NODE_ENV=production
   PORT=3000
   
   # Base de données (utiliser les valeurs de l'Étape 1)
   DB_HOST=raiatea-mysql
   DB_USER=raiatea
   DB_PASSWORD=[votre_mot_de_passe_mysql]
   DB_NAME=raiatea_db
   DB_PORT=3306
   
   # Resend API
   RESEND_API_KEY=[votre_cle_resend]
   RESEND_FROM=contact@raiatearentcar.com
   EMAIL_TO=raiatearentcar@mail.pf
   
   # Sécurité
   ALLOWED_ORIGINS=https://form.raiatearentcar.com
   ADMIN_USER=admin
   ADMIN_PASS=[mot_de_passe_admin_securise]
   
   # Cartes bancaires
   ALLOW_FULL_CARD=false
   SEND_FULL_CARD_IN_EMAIL=false
   ALLOWED_CARD_BRANDS=visa,mastercard
   ```

6. **Sauvegarder** la configuration

---

## 🌐 Étape 3 : Configurer le domaine

### Via l'interface Dokploy :

1. **Dans le service `raiatea-app`**, aller dans l'onglet `Domains`

2. **Ajouter un domaine** :
   ```
   Domain: form.raiatearentcar.com
   Port: 3000
   SSL/TLS: Enable (Let's Encrypt automatique)
   ```

3. **Sauvegarder**

4. **Vérifier la configuration DNS** :
   ```bash
   # Sur votre machine locale
   dig form.raiatearentcar.com
   
   # Doit retourner:
   form.raiatearentcar.com. 300 IN A 62.146.172.163
   ```

---

## 🚀 Étape 4 : Déployer l'application

### Via l'interface Dokploy :

1. **Dans le service `raiatea-app`**, cliquez sur `Deploy`

2. **Dokploy va automatiquement** :
   - Cloner le repository GitHub
   - Builder l'image Docker avec le Dockerfile
   - Créer le conteneur
   - Connecter au service MySQL
   - Générer le certificat SSL

3. **Suivre les logs** en temps réel dans l'onglet `Logs`

4. **Attendre** la fin du déploiement (2-5 minutes)

---

## ✅ Étape 5 : Vérifier le déploiement

### Tests de santé :

1. **Health Check** :
   ```bash
   curl https://form.raiatearentcar.com/status
   
   # Réponse attendue:
   {
     "status": "ok",
     "environment": "production",
     "dokploy": true,
     "database": "connected",
     "resend": "configured",
     "time": "2024-01-30T10:30:00.000Z"
   }
   ```

2. **Test du formulaire** :
   - Ouvrir : `https://form.raiatearentcar.com`
   - Vérifier que la page se charge
   - Tester la sélection de langue (FR/EN)

3. **Test email Resend** :
   ```bash
   curl https://form.raiatearentcar.com/test-email
   
   # Vérifier dans les logs Dokploy
   # Vérifier la réception de l'email de test
   ```

4. **Interface admin** :
   ```
   URL: https://form.raiatearentcar.com/admin
   Login: admin
   Password: [votre_mot_de_passe_admin]
   ```

---

## 🔄 Déploiement continu (CI/CD)

### Configuration GitHub → Dokploy :

1. **Dans Dokploy**, aller dans `raiatea-app` → `Settings` → `GitHub Integration`

2. **Activer Auto Deploy** :
   ```
   ☑ Enable Auto Deploy on Push
   Branch: main
   ```

3. **Webhook GitHub** :
   - Dokploy génère automatiquement un webhook
   - Le webhook est déjà configuré sur votre repository

4. **Workflow** :
   ```
   git add .
   git commit -m "Update formulaire"
   git push origin main
   
   → Dokploy détecte le push
   → Build automatique
   → Déploiement automatique
   → Zero-downtime deployment
   ```

---

## 📊 Monitoring et Logs

### Via l'interface Dokploy :

1. **Logs en temps réel** :
   - Onglet `Logs` dans le service
   - Filtrer par niveau : INFO, ERROR, WARN

2. **Métriques** :
   - Onglet `Metrics`
   - CPU, RAM, Disk usage
   - Nombre de requêtes

3. **Logs MySQL** :
   - Dans le service `raiatea-mysql`
   - Onglet `Logs`

---

## 🔧 Commandes utiles via SSH

### Connexion SSH au serveur :

```bash
ssh root@62.146.172.163
```

### Commandes Docker :

```bash
# Lister les conteneurs
docker ps

# Logs de l'application
docker logs raiatea-app -f

# Logs MySQL
docker logs raiatea-mysql -f

# Entrer dans le conteneur app
docker exec -it raiatea-app sh

# Entrer dans MySQL
docker exec -it raiatea-mysql mysql -u raiatea -p
```

### Commandes Dokploy :

```bash
# Statut des services
dokploy status

# Redémarrer un service
dokploy restart raiatea-app

# Voir les logs
dokploy logs raiatea-app
```

---

## 💾 Backups

### Backup automatique MySQL :

1. **Via Dokploy UI** :
   - Service `raiatea-mysql` → `Backups`
   - Activer : `Automatic Backups`
   - Fréquence : Daily à 2h00
   - Rétention : 7 jours

2. **Backup manuel** :
   ```bash
   # Via SSH
   docker exec raiatea-mysql mysqldump -u raiatea -p raiatea_db > backup_$(date +%Y%m%d).sql
   ```

### Backup des PDFs :

Les PDFs sont stockés dans un volume Docker persistant. Pour backup :

```bash
# Via SSH
docker run --rm -v raiatea_pdfs:/data -v /root/backups:/backup alpine tar czf /backup/pdfs_$(date +%Y%m%d).tar.gz -C /data .
```

---

## 🔒 Sécurité

### Recommandations :

1. **Firewall** :
   ```bash
   # Autoriser seulement les ports nécessaires
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```

2. **Mots de passe** :
   - Utiliser des mots de passe forts (20+ caractères)
   - Différents pour chaque service
   - Stockés de manière sécurisée

3. **Variables sensibles** :
   - Ne jamais commiter les `.env` avec vraies valeurs
   - Utiliser uniquement l'interface Dokploy

4. **Mises à jour** :
   ```bash
   # Mettre à jour le système régulièrement
   apt update && apt upgrade -y
   
   # Mettre à jour Dokploy
   dokploy update
   ```

---

## 🐛 Troubleshooting

### Problème : L'application ne démarre pas

1. **Vérifier les logs** :
   ```bash
   docker logs raiatea-app
   ```

2. **Vérifier la connexion MySQL** :
   ```bash
   docker exec raiatea-app node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host:'raiatea-mysql',user:'raiatea',password:'XXX'}).then(c => console.log('OK')).catch(e => console.error(e))"
   ```

3. **Vérifier les variables d'environnement** :
   ```bash
   docker exec raiatea-app env | grep DB_
   ```

### Problème : Emails non reçus

1. **Tester l'API Resend** :
   ```bash
   curl https://form.raiatearentcar.com/test-email
   ```

2. **Vérifier la clé API** :
   ```bash
   docker exec raiatea-app env | grep RESEND_API_KEY
   ```

3. **Vérifier les logs Resend** :
   - Dashboard Resend : https://resend.com/emails
   - Voir les emails envoyés et leur statut

### Problème : Certificat SSL

1. **Vérifier le domaine** :
   ```bash
   dig form.raiatearentcar.com
   ```

2. **Renouveler le certificat** :
   - Via Dokploy UI : Service → Domains → Regenerate SSL

3. **Logs Traefik** :
   ```bash
   docker logs traefik
   ```

---

## 📈 Scaling (si besoin)

### Augmenter les ressources :

1. **Via Dokploy UI** :
   - Service `raiatea-app` → `Resources`
   - Ajuster : CPU, RAM, Disk

2. **Horizontal Scaling** :
   - Ajouter des replicas
   - Load balancer automatique via Traefik

---

## 📞 Support

### En cas de problème :

1. **Consulter les logs** (Dokploy UI ou SSH)
2. **Vérifier le statut** : `/status` endpoint
3. **Tester les composants** individuellement (MySQL, Resend, App)

### Ressources :

- Documentation Dokploy : https://dokploy.com/docs
- Documentation Resend : https://resend.com/docs
- MySQL Documentation : https://dev.mysql.com/doc/

---

## ✅ Checklist finale

Avant de mettre en production :

- [ ] MySQL créé et accessible
- [ ] Application déployée
- [ ] Domaine configuré avec SSL
- [ ] Variables d'environnement configurées
- [ ] Test `/status` OK
- [ ] Test formulaire OK
- [ ] Test email OK
- [ ] Interface admin accessible
- [ ] Backups automatiques activés
- [ ] Monitoring configuré
- [ ] Firewall configuré
- [ ] CI/CD GitHub configuré

---

**🎉 Félicitations ! Votre application est maintenant déployée sur Dokploy !**

L'URL de production est : **https://form.raiatearentcar.com**
