# Dockerfile pour RAIATEA RENT CAR - Optimisé pour Dokploy
# Multi-stage build pour une image légère et sécurisée

# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production
FROM node:18-alpine

# Métadonnées
LABEL maintainer="RAIATEA RENT CAR"
LABEL description="Application de gestion des fiches clients"
LABEL version="2.0-dokploy"

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier les dépendances depuis le builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copier le code de l'application
COPY --chown=nodejs:nodejs . .

# Créer les dossiers nécessaires avec les bonnes permissions
RUN mkdir -p /app/pdfs && \
    chown -R nodejs:nodejs /app/pdfs

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Commande de démarrage
CMD ["node", "server-dokploy.js"]
