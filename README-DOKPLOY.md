# 🚀 README - Migration Dokploy

## ⚠️ IMPORTANT : Nouveau server.js

Le projet a été migré vers **Dokploy** avec une nouvelle architecture.

### Fichiers créés pour Dokploy :

- ✅ `Dockerfile` - Build optimisé Docker
- ✅ `.dockerignore` - Optimisation build
- ✅ `server-dokploy.js` - **NOUVEAU SERVEUR** avec MySQL + Resend
- ✅ `docker-compose.yml` - Tests locaux
- ✅ `.env.dokploy` - Template variables d'environnement
- ✅ `DOKPLOY_DEPLOYMENT.md` - Guide complet de déploiement

---

## 📝 Pour déployer sur Dokploy

### 1. Utiliser le nouveau serveur

**IMPORTANT** : Le fichier `server.js` original utilise SQLite + Brevo.
Le nouveau `server-dokploy.js` utilise MySQL + Resend pour Dokploy.

**Option A : Renommer les fichiers**
```bash
# Backup de l'ancien serveur
mv server.js server-old.js

# Utiliser le nouveau serveur
mv server-dokploy.js server.js
```

**Option B : Modifier le Dockerfile**
```dockerfile
# Dans Dockerfile, ligne CMD:
CMD ["node", "server-dokploy.js"]
```

### 2. Installer les nouvelles dépendances

```bash
npm install
```

Nouvelles dépendances ajoutées :
- `mysql2` - Driver MySQL/MariaDB
- `resend` - API Email Resend
- ❌ Retirées : `sqlite3`, `nodemailer`

### 3. Tester en local avec Docker

```bash
# Copier le template d'environnement
cp .env.dokploy .env

# Éditer avec vos valeurs
nano .env

# Lancer avec Docker Compose
npm run docker:run

# Vérifier les logs
npm run docker:logs

# Tester l'application
curl http://localhost:3000/status
```

### 4. Déployer sur Dokploy

Suivre le guide complet : `DOKPLOY_DEPLOYMENT.md`

---

## 🔄 Différences principales

| Aspect | Ancien (Render) | Nouveau (Dokploy) |
|--------|----------------|------------------|
| **Base de données** | SQLite | MySQL 8.0 |
| **Email** | Brevo/Nodemailer | Resend API |
| **Hébergement** | Render.com | Dokploy (auto-hébergé) |
| **Déploiement** | Git push | GitHub → Dokploy webhook |
| **SSL** | Automatique Render | Let's Encrypt via Traefik |
| **Domaine** | xxx.onrender.com | form.raiatearentcar.com |

---

## ✅ Avantages de Dokploy

- ✅ **Base MySQL persistante** (vs SQLite en /tmp)
- ✅ **Contrôle total** du serveur
- ✅ **Backups automatiques** configurables
- ✅ **Pas de sleep** (toujours actif)
- ✅ **Monitoring intégré**
- ✅ **Resend plus fiable** (3000 emails/mois gratuit)

---

## 📧 Configuration Resend

1. Créer un compte : https://resend.com
2. Vérifier le domaine `raiatearentcar.com`
3. Générer une API Key
4. Ajouter dans les variables d'environnement Dokploy

---

## 🆘 Support

- Guide complet : `DOKPLOY_DEPLOYMENT.md`
- Logs : `docker logs raiatea-app -f`
- Health check : `https://form.raiatearentcar.com/status`
- Test email : `https://form.raiatearentcar.com/test-email`

---

**Prêt pour le déploiement !** 🎉
