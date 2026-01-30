# 🚀 DÉPLOIEMENT IMMÉDIAT - 5 MINUTES

## ⚡ Méthode ultra-rapide (Copier-Coller)

### 1️⃣ Ouvrir un terminal et se connecter au serveur

```bash
ssh root@62.146.172.163
# Password: 08061982
```

### 2️⃣ Copier-coller ce script complet dans le terminal

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement RAIATEA RENT CAR..."

# Créer MySQL
echo "🗄️ MySQL..."
docker rm -f raiatea-mysql 2>/dev/null || true
docker run -d \
  --name raiatea-mysql \
  --network bridge \
  -e MYSQL_ROOT_PASSWORD=rootpass2024secure \
  -e MYSQL_DATABASE=raiatea_db \
  -e MYSQL_USER=raiatea \
  -e MYSQL_PASSWORD=raiatea2024password \
  -p 3306:3306 \
  --restart unless-stopped \
  -v raiatea-mysql-data:/var/lib/mysql \
  mysql:8.0

echo "⏳ Attente MySQL (30s)..."
sleep 30

# Créer dossier app
echo "📂 Préparation..."
mkdir -p /root/raiatea-app
cd /root/raiatea-app

# Créer Dockerfile
cat > Dockerfile << 'DOCKERFILEEOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
RUN mkdir -p /app/pdfs && chown -R nodejs:nodejs /app/pdfs
USER nodejs
EXPOSE 3000
CMD ["node", "server.js"]
DOCKERFILEEOF

# Créer package.json
cat > package.json << 'PACKAGEEOF'
{
  "name": "raiatea-rent-car",
  "version": "2.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "resend": "^3.0.0",
    "pdfkit": "^0.13.0",
    "dotenv": "^16.3.1",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "express-rate-limit": "^7.1.0",
    "uuid": "^9.0.0"
  }
}
PACKAGEEOF

# Créer .env
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
DB_HOST=raiatea-mysql
DB_USER=raiatea
DB_PASSWORD=raiatea2024password
DB_NAME=raiatea_db
DB_PORT=3306
RESEND_API_KEY=METTRE_VOTRE_CLE_ICI
RESEND_FROM=contact@raiatearentcar.com
EMAIL_TO=raiatearentcar@mail.pf
ALLOWED_ORIGINS=https://form.raiatearentcar.com
ALLOW_FULL_CARD=false
ALLOWED_CARD_BRANDS=visa,mastercard
ENVEOF

echo "✅ Fichiers créés"
echo "⚠️  IMPORTANT: Éditer .env avec votre RESEND_API_KEY !"
echo ""
echo "Pour continuer, tapez:"
echo "  nano .env"
echo "  # Remplacer RESEND_API_KEY=..."
echo "  # Puis Ctrl+O, Enter, Ctrl+X"
```

### 3️⃣ Éditer la clé Resend

```bash
nano /root/raiatea-app/.env
# Remplacer: RESEND_API_KEY=METTRE_VOTRE_CLE_ICI
# Par votre vraie clé Resend
# Sauvegarder: Ctrl+O, Enter, Ctrl+X
```

### 4️⃣ Copier les fichiers depuis votre machine locale

**Dans un NOUVEAU terminal sur votre machine locale:**

```bash
cd /home/dev/Bureau/fiche-client-raiatea-rent-car

# Copier le serveur
scp server-dokploy.js root@62.146.172.163:/root/raiatea-app/server.js

# Copier le dossier public
scp -r public/ root@62.146.172.163:/root/raiatea-app/
```

### 5️⃣ Retour sur le serveur - Build et Run

**Dans le terminal SSH du serveur:**

```bash
cd /root/raiatea-app

# Build
echo "🐳 Build Docker..."
docker build -t raiatea-app:latest .

# Run
echo "🚀 Démarrage..."
docker rm -f raiatea-app 2>/dev/null || true
docker run -d \
  --name raiatea-app \
  --network bridge \
  --link raiatea-mysql:mysql \
  -p 3000:3000 \
  --restart unless-stopped \
  -v raiatea-pdfs:/app/pdfs \
  --env-file .env \
  raiatea-app:latest

sleep 10

# Test
echo "🏥 Test de l'application..."
curl http://localhost:3000/status

docker ps | grep raiatea

echo ""
echo "✅ DÉPLOIEMENT TERMINÉ !"
echo "🌐 App accessible sur: http://62.146.172.163:3000"
```

---

## ✅ Vérifications

```bash
# Logs app
docker logs raiatea-app -f

# Logs MySQL
docker logs raiatea-mysql

# Status
curl http://localhost:3000/status

# Test email
curl http://localhost:3000/test-email
```

---

## 🌐 Configurer le domaine (après)

Via l'interface Dokploy ou Traefik:
- Domaine: `form.raiatearentcar.com`
- Port: `3000`
- SSL: Let's Encrypt

---

## 🆘 Problème ?

```bash
# Redémarrer
docker restart raiatea-app

# Voir les logs
docker logs raiatea-app --tail 100

# Reconstruire
cd /root/raiatea-app
docker build -t raiatea-app:latest .
docker restart raiatea-app
```

---

**C'EST TOUT ! 🎉**
