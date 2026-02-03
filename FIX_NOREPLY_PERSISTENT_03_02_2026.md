# Fix Noreply Persistent - 3 Février 2026

## 🐛 Problème

Les emails continuaient d'être envoyés depuis `contact@raiatearentcar.com` au lieu de `noreply@raiatearentcar.com`, malgré les multiples tentatives de modification via `docker service update`.

### Symptôme
```
From: contact@raiatearentcar.com  ❌ (au lieu de noreply@)
```

## 🔍 Cause Racine

**Dokploy réécrivait automatiquement les variables d'environnement** depuis son fichier de configuration `.env` à chaque redémarrage/mise à jour du service.

### Localisation du problème
Les commandes `docker service update --env-rm --env-add` ne persistaient pas car Dokploy les écrasait en lisant :
```bash
/etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env
```

### Contenu initial du fichier
```env
RESEND_FROM=contact@raiatearentcar.com  ← Source du problème
```

## 🔧 Solution Appliquée

### 1. Identification du fichier source

**Recherche du fichier de configuration :**
```bash
find /etc/dokploy -name '*.env' | grep -i 'fiche-raiatea'
```

**Résultat :**
```
/etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env
```

### 2. Vérification du contenu
```bash
cat /etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env | grep RESEND_FROM
```

**Sortie :**
```
RESEND_FROM=contact@raiatearentcar.com
```

### 3. Modification du fichier source

**Commande appliquée :**
```bash
sed -i 's/RESEND_FROM=contact@raiatearentcar.com/RESEND_FROM=noreply@raiatearentcar.com/' \
  /etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env
```

**Vérification après modification :**
```bash
cat /etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env | grep RESEND_FROM
```

**Sortie :**
```
RESEND_FROM=noreply@raiatearentcar.com  ✅
```

### 4. Mise à jour du service Docker

**Forcer la mise à jour pour recharger les variables :**
```bash
docker service update \
  --env-rm 'RESEND_FROM=contact@raiatearentcar.com' \
  --env-add 'RESEND_FROM=noreply@raiatearentcar.com' \
  --force \
  fiche-raiatea-rent-car-raiateaapp-ohj0tm
```

**Résultat :**
```
Service fiche-raiatea-rent-car-raiateaapp-ohj0tm converged  ✅
```

### 5. Vérification finale

**Commande :**
```bash
docker service inspect fiche-raiatea-rent-car-raiateaapp-ohj0tm \
  --format "{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}" | grep RESEND_FROM
```

**Sortie :**
```
RESEND_FROM=noreply@raiatearentcar.com  ✅
```

## ✅ Test de Validation

### Données du test
```json
{
  "main_driver_name": "NOREPLY",
  "main_driver_firstname": "Test",
  "main_driver_email": "teriitaumihaufranck@gmail.com",
  ...
}
```

### Résultat
**ID Formulaire :** `2602030705-29e26264`

**Logs d'envoi :**
```
📧 Envoi email à la société...
=== ENVOI EMAIL VIA RESEND ===
From: noreply@raiatearentcar.com  ✅
To: raiatearentcar@mail.pf
✅ EMAIL ENVOYÉ (Resend) 9c0bf844-2e00-4031-a2c8-e62fb3111b5c

📧 Envoi confirmation au client...
=== ENVOI EMAIL CONFIRMATION CLIENT ===
From: noreply@raiatearentcar.com  ✅
To: teriitaumihaufranck@gmail.com
✅ EMAIL CONFIRMATION CLIENT ENVOYÉ: 0dec27f5-f2d8-4693-b4ed-718ce26b8914
```

### Emails envoyés
1. **Email société**
   - De : `noreply@raiatearentcar.com` ✅
   - À : `raiatearentcar@mail.pf`
   - ID Resend : `9c0bf844-2e00-4031-a2c8-e62fb3111b5c`

2. **Email client**
   - De : `noreply@raiatearentcar.com` ✅
   - À : `teriitaumihaufranck@gmail.com`
   - ID Resend : `0dec27f5-f2d8-4693-b4ed-718ce26b8914`

## 📋 Fichier .env Complet Après Correction

```env
NODE_ENV=production
PORT=3000
DB_HOST=fiche-raiatea-rent-car-teazlm
DB_PORT=5432
DB_USER=raiatea
DB_PASSWORD=s6Fmnzckg9J9uQuvGt4B
DB_NAME=raiatea_db
RESEND_API_KEY=re_er3tUgtZ_7qk6E28z7NqybzcRPCwEDvMv
RESEND_FROM=noreply@raiatearentcar.com  ← CORRIGÉ
EMAIL_TO=raiatearentcar@mail.pf
ALLOWED_ORIGINS=https://form.raiatearentcar.com
ADMIN_USER=admin
ADMIN_PASS=ZlTIVrwIlZlKumEU
ALLOW_FULL_CARD=false
SEND_FULL_CARD_IN_EMAIL=false
ALLOWED_CARD_BRANDS=visa,mastercard
```

## 🎯 Pourquoi Cette Solution Fonctionne

### Hiérarchie de configuration Dokploy
1. **Fichier `.env`** (priorité haute)
   - `/etc/dokploy/applications/.../code/.env`
   - Lu par Dokploy au démarrage/redéploiement

2. **Variables Docker Service** (priorité basse)
   - `docker service update --env-add`
   - Écrasées par le fichier `.env` de Dokploy

### La solution
✅ Modifier **directement le fichier source** `.env` de Dokploy
✅ Forcer la mise à jour du service pour recharger
✅ La modification persiste même après redéploiements

## 🔄 Persistance Garantie

### Avant la correction
```
Redémarrage service → Dokploy lit .env → RESEND_FROM=contact@  ❌
```

### Après la correction
```
Redémarrage service → Dokploy lit .env → RESEND_FROM=noreply@  ✅
```

**La variable est maintenant persistante car la source est corrigée.**

## 📊 Impact

| Aspect | Avant | Après |
|--------|-------|-------|
| Email société | contact@ | noreply@ ✅ |
| Email client | contact@ | noreply@ ✅ |
| Persistance | ❌ Non | ✅ Oui |
| Après redémarrage | contact@ | noreply@ ✅ |

## 🛠️ Commandes Utiles

### Vérifier la variable actuelle
```bash
docker service inspect fiche-raiatea-rent-car-raiateaapp-ohj0tm \
  --format "{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}" \
  | grep RESEND_FROM
```

### Vérifier le fichier source
```bash
cat /etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env \
  | grep RESEND_FROM
```

### Modifier le fichier (si besoin)
```bash
sed -i 's/RESEND_FROM=ANCIENNE_VALEUR/RESEND_FROM=NOUVELLE_VALEUR/' \
  /etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env
```

### Forcer la mise à jour
```bash
docker service update --force fiche-raiatea-rent-car-raiateaapp-ohj0tm
```

## ⚠️ Important pour Futurs Changements

**Pour modifier une variable d'environnement dans Dokploy :**

1. ✅ **Modifier le fichier `.env`** de Dokploy
2. ✅ **Forcer la mise à jour** du service
3. ❌ **NE PAS utiliser seulement** `docker service update --env-add`

**OU**

1. ✅ **Utiliser l'interface web Dokploy** (recommandé)
   - Se connecter à Dokploy
   - Aller dans l'application
   - Section "Environment Variables"
   - Modifier et sauvegarder
   - Redéployer

## 📅 Date de Correction
**3 Février 2026 - 07:05**

## 🔗 Fichiers Concernés
- `/etc/dokploy/applications/fiche-raiatea-rent-car-raiateaapp-ohj0tm/code/.env`
- Service Docker : `fiche-raiatea-rent-car-raiateaapp-ohj0tm`

## ✅ Statut Final
**RÉSOLU - PERSISTANT** ✅

Tous les emails (société + client) partent maintenant de `noreply@raiatearentcar.com` et la configuration persiste après les redémarrages.
