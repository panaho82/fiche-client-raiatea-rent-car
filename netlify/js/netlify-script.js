document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const form = document.querySelector('form[name="client-form"]');
    const languageSelect = document.getElementById('language-select');
    const hasAdditionalDriverCheckbox = document.getElementById('has-additional-driver');
    const additionalDriverSection = document.getElementById('additional-driver-section');
    const successMessage = document.getElementById('success-message');
    const signaturePadCanvas = document.getElementById('signature-pad');
    const clearSignatureButton = document.getElementById('clear-signature');
    const signatureDataInput = document.getElementById('signature-data');
    const submissionDateInput = document.getElementById('submission-date');
    
    // Initialisation du pad de signature
    const signaturePad = new SignaturePad(signaturePadCanvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 1,
        maxWidth: 2.5
    });
    
    // Changement de langue
    languageSelect.addEventListener('change', function() {
        setLanguage(this.value);
    });
    
    // Initialiser la langue
    setLanguage(languageSelect.value);
    
    // Réinitialiser le pad de signature
    clearSignatureButton.addEventListener('click', function() {
        signaturePad.clear();
    });
    
    // Afficher/masquer la section conducteur additionnel
    hasAdditionalDriverCheckbox.addEventListener('change', function() {
        toggleSection(this.checked, additionalDriverSection);
    });
    
    // Soumission du formulaire
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Vérifier si la signature est vide
        if (signaturePad.isEmpty()) {
            alert(languageSelect.value === 'fr' ? 
                'Veuillez signer le formulaire avant de l\'envoyer.' : 
                'Please sign the form before submitting.');
            return;
        }
        
        // Ajouter la signature aux données
        signatureDataInput.value = signaturePad.toDataURL();
        
        // Ajouter la date de soumission
        submissionDateInput.value = new Date().toISOString();
        
        // Ajouter la langue sélectionnée
        document.getElementById('language').value = languageSelect.value;
        
        // Afficher un message de chargement
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = languageSelect.value === 'fr' ? 
            '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...' : 
            '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;
        
        // Soumettre le formulaire (Netlify s'occupe du reste)
        fetch('/', {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(new FormData(form)).toString()
        })
        .then(() => {
            // Masquer le formulaire et afficher le message de succès
            form.style.display = 'none';
            successMessage.classList.remove('hidden');
            successMessage.style.display = 'block';
        })
        .catch((error) => {
            console.error('Erreur:', error);
            alert(languageSelect.value === 'fr' ? 
                'Une erreur est survenue. Veuillez réessayer.' : 
                'An error occurred. Please try again.');
            
            // Restaurer le bouton
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        });
    });
    
    function setLanguage(lang) {
        // Mettre à jour l'attribut data-language sur le body
        document.body.setAttribute('data-language', lang);
        
        // Cacher tous les éléments de langue
        document.querySelectorAll('.lang-fr, .lang-en').forEach(el => {
            el.style.display = 'none';
        });
        
        // Afficher les éléments de la langue sélectionnée
        document.querySelectorAll(`.lang-${lang}`).forEach(el => {
            el.style.display = 'block';
        });
        
        // Mettre à jour le champ langue caché
        document.getElementById('language').value = lang;
    }
    
    function toggleSection(isVisible, section) {
        if (isVisible) {
            section.classList.remove('hidden');
            section.style.display = 'block';
        } else {
            section.classList.add('hidden');
            section.style.display = 'none';
        }
    }
    
    // Auto-resize textarea si nécessaire
    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    
    // Ajouter l'auto-resize aux textareas
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', () => autoResize(textarea));
        autoResize(textarea); // Initial resize
    });
});

// Style CSS pour les éléments cachés
const style = document.createElement('style');
style.textContent = `
    .hidden { display: none !important; }
    
    .success-message {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 20px;
        border-radius: 5px;
        text-align: center;
        margin-top: 20px;
    }
    
    .submit-btn {
        background-color: #FFD700;
        color: #333;
        padding: 15px 30px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        width: 100%;
        margin-top: 20px;
        transition: background-color 0.3s;
    }
    
    .submit-btn:hover {
        background-color: #E6C200;
    }
    
    .submit-btn:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
    
    .signature-section {
        text-align: center;
        margin: 20px 0;
    }
    
    #signature-pad {
        border: 2px solid #ddd;
        border-radius: 5px;
        margin: 10px 0;
    }
    
    #clear-signature {
        background-color: #dc3545;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 10px;
    }
    
    .checkbox-group {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 20px 0;
    }
    
    .checkbox-group input[type="checkbox"] {
        margin-top: 5px;
    }
    
    .checkbox-group label {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
    }
`;
document.head.appendChild(style); 