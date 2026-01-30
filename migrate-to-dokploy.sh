#!/bin/bash

# ============================================
# Script de migration vers Dokploy
# RAIATEA RENT CAR - Client Form Application
# ============================================

set -e

echo "🚀 Migration vers Dokploy - RAIATEA RENT CAR"
echo "============================================="
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé${NC}"
    echo "Exécutez ce script depuis la racine du projet"
    exit 1
fi

echo -e "${YELLOW}📋 Étape 1/5 : Backup des fichiers existants${NC}"
if [ -f "server.js" ]; then
    cp server.js server-old-backup.js
    echo -e "${GREEN}✅ Backup créé: server-old-backup.js${NC}"
else
    echo -e "${YELLOW}⚠️  Aucun server.js à backuper${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Étape 2/5 : Activation du nouveau serveur Dokploy${NC}"
if [ -f "server-dokploy.js" ]; then
    # Option: remplacer server.js par server-dokploy.js
    read -p "Remplacer server.js par server-dokploy.js ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mv server.js server-old.js 2>/dev/null || true
        cp server-dokploy.js server.js
        echo -e "${GREEN}✅ server.js remplacé par la version Dokploy${NC}"
    else
        echo -e "${YELLOW}⚠️  server.js non modifié (utiliser server-dokploy.js dans Dockerfile)${NC}"
    fi
else
    echo -e "${RED}❌ Erreur: server-dokploy.js non trouvé${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Étape 3/5 : Installation des nouvelles dépendances${NC}"
npm install mysql2 resend --save
echo -e "${GREEN}✅ Dépendances installées: mysql2, resend${NC}"

echo ""
echo -e "${YELLOW}📋 Étape 4/5 : Configuration de l'environnement${NC}"
if [ ! -f ".env" ]; then
    cp .env.dokploy .env
    echo -e "${GREEN}✅ Fichier .env créé depuis .env.dokploy${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Éditer .env avec vos vraies valeurs !${NC}"
else
    echo -e "${YELLOW}⚠️  .env existe déjà, non modifié${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Étape 5/5 : Mise à jour du .gitignore${NC}"
if ! grep -q ".env.dokploy" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Dokploy" >> .gitignore
    echo ".env.dokploy" >> .gitignore
    echo "server-old*.js" >> .gitignore
    echo -e "${GREEN}✅ .gitignore mis à jour${NC}"
else
    echo -e "${YELLOW}⚠️  .gitignore déjà à jour${NC}"
fi

echo ""
echo "============================================="
echo -e "${GREEN}✅ Migration terminée avec succès !${NC}"
echo "============================================="
echo ""
echo "📝 Prochaines étapes:"
echo ""
echo "1. Éditer le fichier .env avec vos valeurs:"
echo "   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
echo "   - RESEND_API_KEY"
echo "   - EMAIL_TO"
echo ""
echo "2. Tester en local avec Docker:"
echo "   $ npm run docker:run"
echo "   $ curl http://localhost:3000/status"
echo ""
echo "3. Commiter et pusher sur GitHub:"
echo "   $ git add ."
echo "   $ git commit -m \"Migration vers Dokploy\""
echo "   $ git push origin main"
echo ""
echo "4. Déployer sur Dokploy:"
echo "   Suivre le guide: DOKPLOY_DEPLOYMENT.md"
echo ""
echo -e "${GREEN}🎉 Bonne migration !${NC}"
