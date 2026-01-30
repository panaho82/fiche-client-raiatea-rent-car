# ⚡ Guide Rapide - Déploiement Dokploy

## 🎯 En 10 minutes

### 1️⃣ Préparer le code (2 min)

```bash
cd /home/dev/Bureau/fiche-client-raiatea-rent-car

# Exécuter le script de migration
./migrate-to-dokploy.sh

# Éditer les variables d'environnement
nano .env
```

### 2️⃣ Obtenir l'API Key Resend (3 min)

1. Aller sur : https://resend.com
2. S'inscrire / Se connecter
3. Vérifier le domaine `raiatearentcar.com`
4. Générer une API Key
5. Copier la clé dans `.env` → `RESEND_API_KEY=re_xxxxx`

### 3️⃣ Créer MySQL sur Dokploy (2 min)

1. Ouvrir Dokploy : `http://62.146.172.163:3000`
2. Nouveau projet : `raiatea-rent-car`
3. Add Service → Database → MySQL 8.0
4. Configuration :
   - Name: `raiatea-mysql`
   - Database: `raiatea_db`
   - User: `raiatea`
   - Password: [générer fort]
5. Deploy

### 4️⃣ Créer l'application sur Dokploy (3 min)

1. Dans le même projet → Add Service → Application
2. Git Repository :
   - URL: `https://github.com/votre-user/fiche-client-raiatea-rent-car`
   - Branch: `main`
3. Build Type: `Dockerfile`
4. Port: `3000`
5. Variables d'environnement (copier de `.env.dokploy`)
6. Domain: `form.raiatearentcar.com`
7. Deploy

### 5️⃣ Vérifier (1 min)

```bash
# Health check
curl https://form.raiatearentcar.com/status

# Test email
curl https://form.raiatearentcar.com/test-email

# Ouvrir le formulaire
open https://form.raiatearentcar.com
```

---

## ✅ C'est prêt !

**Votre application tourne sur :**
- 🌐 URL: https://form.raiatearentcar.com
- 🗄️ MySQL: Persistant et backupé
- 📧 Emails: Via Resend
- 🔒 SSL: Automatique
- 🚀 CI/CD: Activé

---

## 🆘 Problème ?

```bash
# Voir les logs
ssh root@62.146.172.163
docker logs raiatea-app -f

# Vérifier MySQL
docker exec -it raiatea-mysql mysql -u raiatea -p
```

**Guide complet :** `DOKPLOY_DEPLOYMENT.md`
