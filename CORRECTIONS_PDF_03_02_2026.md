# Corrections PDF - 03 Février 2026

## 🎯 Corrections Appliquées

### 1. ✅ Affichage des Numéros de Carte Complets
**Problème :** Les numéros de carte étaient masqués (seulement 4 derniers chiffres affichés)

**Solution :** 
- Fichier modifié : `server-dokploy.js` (ligne ~779-782)
- Suppression du masquage conditionnel
- Les numéros de carte complets sont maintenant affichés dans le PDF

```javascript
// AVANT :
clientData.main_driver_credit_card = ALLOW_FULL_CARD ? pan : maskCardNumber(pan);

// APRÈS :
// Garder le numéro complet pour le PDF
clientData.main_driver_credit_card = pan;
```

### 2. ✅ Positionnement des Titres dans les Cases Jaunes
**Problème :** Les titres des sections (CONDUCTEUR PRINCIPAL, CARTE DE CRÉDIT, etc.) étaient décalés par rapport aux rectangles jaunes

**Solution :**
- Fichier modifié : `server-dokploy.js` (fonction `drawSectionTitle`, ligne ~534-542)
- Correction du calcul de position Y
- Les titres sont maintenant centrés verticalement dans les rectangles

```javascript
// AVANT :
const drawSectionTitle = (title) => {
  doc.moveDown(1);
  doc.rect(40, doc.y, pageWidth, 24).fill('#E6B800');
  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
  doc.text(title, 50, doc.y - 18); // ❌ Position incorrecte
  doc.fillColor('#000000');
  doc.moveDown(1.2);
};

// APRÈS :
const drawSectionTitle = (title) => {
  doc.moveDown(1);
  const currentY = doc.y; // ✅ Sauvegarder la position
  doc.rect(40, currentY, pageWidth, 24).fill('#E6B800');
  doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
  doc.text(title, 50, currentY + 6); // ✅ Position correcte
  doc.fillColor('#000000');
  doc.y = currentY + 24; // ✅ Repositionner après le rectangle
  doc.moveDown(1.2);
};
```

### 3. ✅ Configuration Email : noreply@raiatearentcar.com
**Problème :** Les emails étaient envoyés depuis `contact@raiatearentcar.com`

**Solution :**
- Modification de la variable d'environnement Docker
- Commande exécutée sur le serveur :
```bash
docker service update --env-rm RESEND_FROM \
  --env-add 'RESEND_FROM=noreply@raiatearentcar.com' \
  fiche-raiatea-rent-car-raiateaapp-ohj0tm
```

## 📝 Commit GitHub
**Commit Hash :** `1310722`
**Message :** `fix: Show full credit card numbers in PDF and fix section title positioning`
**Fichiers modifiés :** `server-dokploy.js`

## ✅ Tests de Validation

### Test 1 - Sophie DURAND
- **ID :** `2602030555-33d9dc7c`
- **Email :** `ac57852a-2861-4cc5-8f51-406a3ef90c21`
- **Carte :** `5555555555554444` (Mastercard)

### Test 2 - Marc LEFEBVRE
- **ID :** `2602030557-2915177f`
- **Email :** `97d96c81-a818-4192-ac1d-67e02d265321`
- **Carte :** `4532015112830366` (Visa)

### Test 3 - Claire BERNARD
- **ID :** `2602030558-cf8e4126`
- **Email :** `ec9ad67f-ea41-477b-8f1b-02f414095aae`
- **Carte :** `4024007198964305` (Visa)

### Test 4 - Thomas MOREAU (avec noreply)
- **ID :** `2602030601-bed5cda0`
- **Email :** `33c355af-9789-4e9a-9a49-92f4b7711498`
- **Carte :** `5425233430109903` (Mastercard)
- **From :** ✅ `noreply@raiatearentcar.com`

## 📊 Statut Final

| Fonctionnalité | Statut |
|----------------|--------|
| Numéros de carte complets dans PDF | ✅ Fonctionnel |
| Titres alignés dans cases jaunes | ✅ Corrigé |
| Email depuis noreply@ | ✅ Configuré |
| Code sauvegardé sur GitHub | ✅ Fait |
| Déployé sur serveur | ✅ Opérationnel |

## 🔗 URLs
- **Application :** https://form.raiatearentcar.com
- **Repository :** https://github.com/panaho82/fiche-client-raiatea-rent-car
- **Email destinataire :** raiatearentcar@mail.pf

## 📅 Date
**3 Février 2026 - 06:01**
