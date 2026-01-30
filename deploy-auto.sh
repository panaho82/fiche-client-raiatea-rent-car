#!/bin/bash

# ============================================
# DÉPLOIEMENT AUTOMATIQUE DOKPLOY
# RAIATEA RENT CAR
# ============================================

set -e

SERVER="62.146.172.163"
SSH_USER="root"
SSH_PASS="08061982"

echo "🚀 DÉPLOIEMENT AUTOMATIQUE DOKPLOY"
echo "===================================="
echo ""

# Installer sshpass si nécessaire
if ! command -v sshpass &> /dev/null; then
    echo "📦 Installation de sshpass..."
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
fi

# Fonction pour exécuter des commandes SSH
ssh_exec() {
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER" "$@"
}

# Fonction pour copier des fichiers
scp_copy() {
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$@"
}

echo "✅ Connexion au serveur..."
ssh_exec "echo 'Connecté à Dokploy'" || {
    echo "❌ Erreur de connexion SSH"
    exit 1
}

echo ""
echo "📊 Vérification de l'environnement..."
ssh_exec "docker --version && docker ps"

echo ""
echo "🗄️ Création du service MySQL..."
ssh_exec "docker run -d \
    --name raiatea-mysql \
    --network dokploy-network \
    -e MYSQL_ROOT_PASSWORD=rootpass2024secure \
    -e MYSQL_DATABASE=raiatea_db \
    -e MYSQL_USER=raiatea \
    -e MYSQL_PASSWORD=raiatea2024password \
    -p 3306:3306 \
    --restart unless-stopped \
    -v raiatea-mysql-data:/var/lib/mysql \
    mysql:8.0" 2>/dev/null || echo "⚠️ MySQL existe déjà ou erreur"

echo "⏳ Attente du démarrage MySQL (30s)..."
sleep 30

echo ""
echo "🗄️ Vérification MySQL..."
ssh_exec "docker exec raiatea-mysql mysqladmin -u root -prootpass2024secure ping" || {
    echo "⚠️ MySQL pas encore prêt, attente supplémentaire..."
    sleep 15
}

echo ""
echo "📂 Création du dossier de déploiement..."
ssh_exec "mkdir -p /root/raiatea-app"

echo ""
echo "📤 Envoi des fichiers..."
scp_copy -r \
    Dockerfile \
    .dockerignore \
    package.json \
    server-dokploy.js \
    public/ \
    "$SSH_USER@$SERVER:/root/raiatea-app/"

echo ""
echo "🔧 Renommage du serveur..."
ssh_exec "cd /root/raiatea-app && mv server-dokploy.js server.js"

echo ""
echo "📝 Création du fichier .env..."
ssh_exec "cat > /root/raiatea-app/.env << 'ENVEOF'
NODE_ENV=production
PORT=3000

DB_HOST=raiatea-mysql
DB_USER=raiatea
DB_PASSWORD=raiatea2024password
DB_NAME=raiatea_db
DB_PORT=3306

RESEND_API_KEY=REMPLACER_PAR_VRAIE_CLE
RESEND_FROM=contact@raiatearentcar.com
EMAIL_TO=raiatearentcar@mail.pf

ALLOWED_ORIGINS=https://form.raiatearentcar.com
ALLOW_FULL_CARD=false
ALLOWED_CARD_BRANDS=visa,mastercard
ENVEOF
"

echo ""
echo "🐳 Build de l'image Docker..."
ssh_exec "cd /root/raiatea-app && docker build -t raiatea-app:latest ."

echo ""
echo "🚀 Démarrage de l'application..."
ssh_exec "docker rm -f raiatea-app 2>/dev/null || true"
ssh_exec "docker run -d \
    --name raiatea-app \
    --network dokploy-network \
    -p 3000:3000 \
    --restart unless-stopped \
    -v raiatea-pdfs:/app/pdfs \
    --env-file /root/raiatea-app/.env \
    raiatea-app:latest"

echo ""
echo "⏳ Attente du démarrage de l'app (15s)..."
sleep 15

echo ""
echo "✅ Vérification du déploiement..."
ssh_exec "docker ps | grep raiatea"

echo ""
echo "🏥 Health Check..."
ssh_exec "curl -s http://localhost:3000/status || echo '⚠️ App pas encore prête'"

echo ""
echo "============================================="
echo "✅ DÉPLOIEMENT TERMINÉ !"
echo "============================================="
echo ""
echo "📊 Statut des services:"
ssh_exec "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep raiatea"

echo ""
echo "📝 ACTIONS RESTANTES MANUELLES:"
echo ""
echo "1. ⚠️ IMPORTANT: Configurer la vraie RESEND_API_KEY"
echo "   ssh root@62.146.172.163"
echo "   nano /root/raiatea-app/.env"
echo "   # Remplacer RESEND_API_KEY=..."
echo "   docker restart raiatea-app"
echo ""
echo "2. Configurer Traefik/Reverse Proxy pour le domaine:"
echo "   - form.raiatearentcar.com → localhost:3000"
echo "   - SSL Let's Encrypt"
echo ""
echo "3. Tester:"
echo "   curl http://62.146.172.163:3000/status"
echo "   curl http://62.146.172.163:3000/test-email"
echo ""
echo "🎉 Application accessible sur: http://62.146.172.163:3000"
