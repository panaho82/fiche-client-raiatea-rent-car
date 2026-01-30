#!/bin/bash
# ============================================
# SCRIPT DE DÉPLOIEMENT COMPLET - À COPIER-COLLER
# Une fois connecté en SSH, copier tout ce script
# ============================================

set -e

echo "🚀 DÉPLOIEMENT RAIATEA RENT CAR SUR DOKPLOY"
echo "============================================="
echo ""

# ===========================
# ÉTAPE 1: MYSQL
# ===========================
echo "🗄️  ÉTAPE 1/5: Déploiement MySQL..."
docker rm -f raiatea-mysql 2>/dev/null || true
docker volume create raiatea-mysql-data 2>/dev/null || true

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

echo "✅ MySQL démarré"
echo "⏳ Attente démarrage (30s)..."
sleep 30

# ===========================
# ÉTAPE 2: FICHIERS APP
# ===========================
echo ""
echo "📂 ÉTAPE 2/5: Création des fichiers..."
mkdir -p /root/raiatea-app/public/{css,js,img}
cd /root/raiatea-app

# Dockerfile
cat > Dockerfile << 'DOCKERFILEEOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine
LABEL description="RAIATEA RENT CAR - Client Form App"
ENV NODE_ENV=production PORT=3000
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .
RUN mkdir -p /app/pdfs && chown -R nodejs:nodejs /app/pdfs
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:3000/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "server.js"]
DOCKERFILEEOF

# package.json
cat > package.json << 'PACKAGEEOF'
{
  "name": "raiatea-rent-car",
  "version": "2.0.0",
  "main": "server.js",
  "engines": {"node": "18.x"},
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

# .dockerignore
cat > .dockerignore << 'DOCKERIGNOREEOF'
node_modules/
*.md
.git/
.env
*.log
DOCKERIGNOREEOF

# .env
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
DB_HOST=raiatea-mysql
DB_USER=raiatea
DB_PASSWORD=raiatea2024password
DB_NAME=raiatea_db
DB_PORT=3306
RESEND_API_KEY=REMPLACER_PAR_VOTRE_CLE_RESEND
RESEND_FROM=contact@raiatearentcar.com
EMAIL_TO=raiatearentcar@mail.pf
ALLOWED_ORIGINS=https://form.raiatearentcar.com
ALLOW_FULL_CARD=false
ALLOWED_CARD_BRANDS=visa,mastercard
ENVEOF

echo "✅ Fichiers de configuration créés"

# ===========================
# ÉTAPE 3: CODE SERVEUR (simplifié pour démonstration)
# ===========================
echo ""
echo "💻 ÉTAPE 3/5: Création du serveur..."
echo "⚠️  IMPORTANT: Les fichiers public/ et server.js doivent être copiés depuis votre machine"
echo ""
echo "PAUSE - Action manuelle requise:"
echo "================================"
echo ""
echo "Dans un NOUVEAU terminal sur votre machine locale, exécutez:"
echo ""
echo "cd /home/dev/Bureau/fiche-client-raiatea-rent-car"
echo "scp server-dokploy.js root@62.146.172.163:/root/raiatea-app/server.js"
echo "scp -r public/ root@62.146.172.163:/root/raiatea-app/"
echo ""
echo "Puis revenez ici et appuyez sur Enter pour continuer..."
read -p ""

# Vérifier que les fichiers sont présents
if [ ! -f "/root/raiatea-app/server.js" ]; then
    echo "❌ server.js manquant !"
    echo "Copiez-le avec: scp server-dokploy.js root@62.146.172.163:/root/raiatea-app/server.js"
    exit 1
fi

if [ ! -d "/root/raiatea-app/public" ]; then
    echo "❌ Dossier public/ manquant !"
    echo "Copiez-le avec: scp -r public/ root@62.146.172.163:/root/raiatea-app/"
    exit 1
fi

echo "✅ Fichiers présents"

# ===========================
# ÉTAPE 4: BUILD DOCKER
# ===========================
echo ""
echo "🐳 ÉTAPE 4/5: Build de l'image Docker..."
docker build -t raiatea-app:latest .

if [ $? -eq 0 ]; then
    echo "✅ Image Docker créée"
else
    echo "❌ Erreur de build"
    exit 1
fi

# ===========================
# ÉTAPE 5: DÉMARRAGE
# ===========================
echo ""
echo "🚀 ÉTAPE 5/5: Démarrage de l'application..."
docker rm -f raiatea-app 2>/dev/null || true
docker volume create raiatea-pdfs 2>/dev/null || true

docker run -d \
  --name raiatea-app \
  --network bridge \
  --link raiatea-mysql:mysql \
  -p 3000:3000 \
  --restart unless-stopped \
  -v raiatea-pdfs:/app/pdfs \
  --env-file .env \
  raiatea-app:latest

echo "✅ Application démarrée"
echo "⏳ Attente initialisation (15s)..."
sleep 15

# ===========================
# VÉRIFICATIONS
# ===========================
echo ""
echo "✅ VÉRIFICATION DU DÉPLOIEMENT"
echo "================================"
echo ""

echo "📊 Conteneurs actifs:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep raiatea

echo ""
echo "🏥 Health Check:"
curl -s http://localhost:3000/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/status

echo ""
echo "============================================="
echo "✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
echo "============================================="
echo ""
echo "🌐 URLs:"
echo "  - Application: http://62.146.172.163:3000"
echo "  - Health: http://62.146.172.163:3000/status"
echo "  - Test Email: http://62.146.172.163:3000/test-email"
echo "  - Admin: http://62.146.172.163:3000/admin"
echo ""
echo "⚠️  ACTIONS REQUISES:"
echo ""
echo "1. Configurer RESEND_API_KEY:"
echo "   nano /root/raiatea-app/.env"
echo "   # Remplacer: RESEND_API_KEY=..."
echo "   docker restart raiatea-app"
echo ""
echo "2. Tester l'application:"
echo "   curl http://localhost:3000/status"
echo "   curl http://localhost:3000/test-email"
echo ""
echo "3. Configurer le domaine form.raiatearentcar.com"
echo "   (via Dokploy UI ou Traefik)"
echo ""
echo "📊 Commandes utiles:"
echo "  docker logs raiatea-app -f          # Voir les logs"
echo "  docker restart raiatea-app          # Redémarrer"
echo "  docker exec -it raiatea-app sh      # Entrer dans le conteneur"
echo ""
echo "🎉 Félicitations ! L'application est déployée !"
