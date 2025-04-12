document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const form = document.getElementById('client-form');
    const languageSelect = document.getElementById('language-select');
    const hasAdditionalDriverCheckbox = document.getElementById('has-additional-driver');
    const additionalDriverSection = document.getElementById('additional-driver-section');
    const hasAdditionalCreditCardCheckbox = document.getElementById('has-additional-credit-card');
    const additionalCreditCardSection = document.getElementById('additional-credit-card-section');
    const successMessage = document.getElementById('success-message');
    const signaturePadCanvas = document.getElementById('signature-pad');
    const clearSignatureButton = document.getElementById('clear-signature');
    const signatureDataInput = document.getElementById('signature-data');
    
    // Éléments pour les conditions de location
    const rentalConditionsToggle = document.getElementById('rental-conditions-toggle');
    const rentalConditionsContent = document.getElementById('rental-conditions-content');
    const rentalConditionsText = document.getElementById('rental-conditions-text');
    
    // Éléments pour le téléchargement des photos de permis
    const mainDriverLicenseFront = document.getElementById('main-driver-license-front');
    const mainDriverLicenseBack = document.getElementById('main-driver-license-back');
    const mainDriverLicenseFrontPreview = document.getElementById('main-driver-license-front-preview');
    const mainDriverLicenseBackPreview = document.getElementById('main-driver-license-back-preview');
    const mainDriverLicenseFrontPreviewContainer = document.getElementById('main-driver-license-front-preview-container');
    const mainDriverLicenseBackPreviewContainer = document.getElementById('main-driver-license-back-preview-container');
    
    const additionalDriverLicenseFront = document.getElementById('additional-driver-license-front');
    const additionalDriverLicenseBack = document.getElementById('additional-driver-license-back');
    const additionalDriverLicenseFrontPreview = document.getElementById('additional-driver-license-front-preview');
    const additionalDriverLicenseBackPreview = document.getElementById('additional-driver-license-back-preview');
    const additionalDriverLicenseFrontPreviewContainer = document.getElementById('additional-driver-license-front-preview-container');
    const additionalDriverLicenseBackPreviewContainer = document.getElementById('additional-driver-license-back-preview-container');
    
    // S'assurer que le message de succès est caché et le formulaire visible au chargement
    successMessage.classList.add('hidden');
    successMessage.style.display = 'none';
    form.style.display = 'block';
    
    // Initialisation du pad de signature
    const signaturePad = new SignaturePad(signaturePadCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 2.5
    });
    
    // Réinitialiser le pad de signature
    clearSignatureButton.addEventListener('click', function() {
        signaturePad.clear();
    });
    
    // Changement de langue
    languageSelect.addEventListener('change', function() {
        setLanguage(this.value);
    });
    
    // Initialiser la langue
    setLanguage(languageSelect.value);
    
    // Gérer l'affichage des conditions de location
    if (rentalConditionsToggle && rentalConditionsContent) {
        // S'assurer que les éléments existent avant d'ajouter des écouteurs d'événements
        rentalConditionsToggle.addEventListener('click', function(e) {
            e.preventDefault(); // Empêcher le comportement par défaut du bouton
            this.classList.toggle('active');
            
            // Basculer l'affichage du contenu
            if (rentalConditionsContent.classList.contains('show')) {
                rentalConditionsContent.classList.remove('show');
            } else {
                rentalConditionsContent.classList.add('show');
            }
            
            // Log pour débogage
            console.log('Bouton conditions cliqué, état de la classe show:', rentalConditionsContent.classList.contains('show'));
        });
        
        // Initialiser le contenu des conditions
        if (rentalConditionsText && typeof rentalConditions !== 'undefined') {
            rentalConditionsText.textContent = rentalConditions[languageSelect.value];
        }
    } else {
        console.error('Les éléments des conditions de location n\'ont pas été trouvés dans le DOM');
    }
    
    // Ajouter des placeholders aux conteneurs de prévisualisation
    const placeholderTextFr = 'Aperçu de l\'image';
    const placeholderTextEn = 'Image preview';
    
    // Définir les placeholders en fonction de la langue actuelle
    function updatePlaceholders(lang) {
        const placeholderText = lang === 'fr' ? placeholderTextFr : placeholderTextEn;
        mainDriverLicenseFrontPreviewContainer.setAttribute('data-placeholder', placeholderText);
        mainDriverLicenseBackPreviewContainer.setAttribute('data-placeholder', placeholderText);
        additionalDriverLicenseFrontPreviewContainer.setAttribute('data-placeholder', placeholderText);
        additionalDriverLicenseBackPreviewContainer.setAttribute('data-placeholder', placeholderText);
    }
    
    // Initialiser les placeholders
    updatePlaceholders(languageSelect.value);
    
    // Gérer le téléchargement des photos de permis du conducteur principal
    mainDriverLicenseFront.addEventListener('change', function(e) {
        handleImageUpload(this, mainDriverLicenseFrontPreview, mainDriverLicenseFrontPreviewContainer, 'main_driver_license_front_data');
    });
    
    mainDriverLicenseBack.addEventListener('change', function(e) {
        handleImageUpload(this, mainDriverLicenseBackPreview, mainDriverLicenseBackPreviewContainer, 'main_driver_license_back_data');
    });
    
    // Gérer le téléchargement des photos de permis du conducteur additionnel
    additionalDriverLicenseFront.addEventListener('change', function(e) {
        handleImageUpload(this, additionalDriverLicenseFrontPreview, additionalDriverLicenseFrontPreviewContainer, 'additional_driver_license_front_data');
    });
    
    additionalDriverLicenseBack.addEventListener('change', function(e) {
        handleImageUpload(this, additionalDriverLicenseBackPreview, additionalDriverLicenseBackPreviewContainer, 'additional_driver_license_back_data');
    });
    
    // Fonction pour gérer le téléchargement et l'aperçu des images
    function handleImageUpload(input, previewImg, previewContainer, hiddenFieldName) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                // Afficher l'aperçu de l'image
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');
                previewContainer.classList.add('has-image');
                
                // Créer ou mettre à jour le champ caché pour stocker les données de l'image
                let hiddenField = document.getElementById(hiddenFieldName);
                if (!hiddenField) {
                    hiddenField = document.createElement('input');
                    hiddenField.type = 'hidden';
                    hiddenField.id = hiddenFieldName;
                    hiddenField.name = hiddenFieldName;
                    form.appendChild(hiddenField);
                }
                hiddenField.value = e.target.result;
            };
            
            reader.readAsDataURL(input.files[0]);
        }
    }
    
    // Afficher/masquer la section conducteur additionnel
    hasAdditionalDriverCheckbox.addEventListener('change', function() {
        toggleSection(this.checked, additionalDriverSection);
        toggleRequiredFields(additionalDriverSection, this.checked);
    });
    
    // Afficher/masquer la section carte de crédit supplémentaire
    hasAdditionalCreditCardCheckbox.addEventListener('change', function() {
        toggleSection(this.checked, additionalCreditCardSection);
        toggleRequiredFields(additionalCreditCardSection, this.checked);
    });
    
    // Soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        // Vérifier si la signature est vide
        if (signaturePad.isEmpty()) {
            alert(languageSelect.value === 'fr' ? 
                'Veuillez signer le formulaire avant de l\'envoyer.' : 
                'Please sign the form before submitting.');
            return;
        }
        
        // Enregistrer les données de la signature
        signatureDataInput.value = signaturePad.toDataURL();
        
        const formData = new FormData(form);
        const formDataObj = {};
        
        formData.forEach((value, key) => {
            if (key === 'has_additional_driver' || key === 'has_additional_credit_card' || 
                key === 'accept_terms' || key === 'accept_data_processing') {
                formDataObj[key] = true; // Les cases cochées sont toujours true (les non-cochées ne sont pas incluses)
            } else {
                formDataObj[key] = value;
            }
        });
        
        // Ajout des champs manquants pour les cases non cochées
        if (!formData.has('has_additional_driver')) {
            formDataObj.has_additional_driver = false;
        }
        
        if (!formData.has('has_additional_credit_card')) {
            formDataObj.has_additional_credit_card = false;
        }
        
        // Afficher un message de chargement
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = languageSelect.value === 'fr' ? 'Envoi en cours...' : 'Submitting...';
        submitButton.disabled = true;
        
        // Masquer le message de succès s'il était visible
        successMessage.classList.add('hidden');
        
        console.log('Envoi des données au serveur:', formDataObj);
        
        // Envoyer les données au serveur
        fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formDataObj)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Erreur serveur: ' + response.status);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Réponse du serveur:', data);
            if (data.error) {
                throw new Error(data.error);
            }
            // Affichage du message de succès seulement si on a un ID valide
            if (data && data.id) {
                form.style.display = 'none';
                successMessage.classList.remove('hidden');
                alert(languageSelect.value === 'fr' ? 
                    'Formulaire soumis avec succès! ID: ' + data.id : 
                    'Form submitted successfully! ID: ' + data.id);
                signaturePad.clear();
            } else {
                throw new Error(languageSelect.value === 'fr' ? 
                    'Réponse du serveur invalide' : 
                    'Invalid server response');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert(languageSelect.value === 'fr' ? 
                'Une erreur est survenue lors de l\'envoi du formulaire: ' + error.message : 
                'An error occurred while submitting the form: ' + error.message);
        })
        .finally(() => {
            // Rétablir le bouton
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
        });
    });
    
    // Fonctions utilitaires
    function setLanguage(lang) {
        document.getElementById('language').value = lang;
        document.querySelectorAll('[class*="lang-"]').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.lang-' + lang).forEach(el => {
            el.style.display = 'block';
        });
        
        // Mettre à jour les conditions de location selon la langue
        if (rentalConditionsText) {
            rentalConditionsText.textContent = rentalConditions[lang];
        }
        
        // Mettre à jour le texte du bouton des conditions
        if (rentalConditionsToggle) {
            const toggleText = lang === 'fr' ? 'Afficher les conditions de location' : 'Show rental conditions';
            const toggleSpan = rentalConditionsToggle.querySelector(`.lang-${lang}`);
            if (toggleSpan) {
                toggleSpan.style.display = 'block';
            }
        }
        
        // Mettre à jour les placeholders des conteneurs de prévisualisation
        updatePlaceholders(lang);
    }
    
    function toggleSection(isVisible, section) {
        if (isVisible) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    }
    
    function toggleRequiredFields(section, isRequired) {
        const inputs = section.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (isRequired) {
                input.setAttribute('required', '');
            } else {
                input.removeAttribute('required');
            }
        });
    }
    
    function validateForm() {
        // Validation des champs requis
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        if (!isValid) {
            alert(languageSelect.value === 'fr' ? 
                'Veuillez remplir tous les champs obligatoires.' : 
                'Please fill in all required fields.');
            return false;
        }
        
        // Pas de validation des cases à cocher pour éviter les erreurs
        // Permettre la soumission même si la case n'est pas cochée
        
        return true;
    }
});
