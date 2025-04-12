document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const clientsList = document.getElementById('clients-list');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const languageFilter = document.getElementById('language-filter');
    const exportBtn = document.getElementById('export-btn');
    const clientModal = document.getElementById('client-modal');
    const closeModalBtn = document.querySelector('.close');
    const clientDetails = document.getElementById('client-details');
    const downloadPdfBtn = document.getElementById('download-pdf');
    const resendEmailBtn = document.getElementById('resend-email');
    const pagination = document.getElementById('pagination');
    
    // Variables d'état
    let allClients = [];
    let filteredClients = [];
    let currentPage = 1;
    const clientsPerPage = 10;
    let selectedClientId = null;
    
    // Chargement initial des clients
    loadClients();
    
    // Événements
    searchBtn.addEventListener('click', filterClients);
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            filterClients();
        }
    });
    
    languageFilter.addEventListener('change', filterClients);
    
    exportBtn.addEventListener('click', exportClientsToCSV);
    
    closeModalBtn.addEventListener('click', function() {
        clientModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === clientModal) {
            clientModal.style.display = 'none';
        }
    });
    
    downloadPdfBtn.addEventListener('click', function() {
        if (selectedClientId) {
            window.open(`/api/download-pdf/${selectedClientId}`, '_blank');
        }
    });
    
    resendEmailBtn.addEventListener('click', function() {
        if (selectedClientId) {
            resendEmail(selectedClientId);
        }
    });
    
    // Fonctions
    function loadClients() {
        fetch('/api/clients')
            .then(response => response.json())
            .then(data => {
                allClients = data;
                filteredClients = [...allClients];
                renderClients();
                renderPagination();
            })
            .catch(error => {
                console.error('Erreur lors du chargement des clients:', error);
                clientsList.innerHTML = '<tr><td colspan="7">Erreur lors du chargement des données</td></tr>';
            });
    }
    
    function filterClients() {
        const searchTerm = searchInput.value.toLowerCase();
        const languageValue = languageFilter.value;
        
        filteredClients = allClients.filter(client => {
            const matchesSearch = 
                client.main_driver_name.toLowerCase().includes(searchTerm) ||
                client.main_driver_firstname.toLowerCase().includes(searchTerm) ||
                client.main_driver_email.toLowerCase().includes(searchTerm) ||
                client.main_driver_phone.toLowerCase().includes(searchTerm);
            
            const matchesLanguage = languageValue === 'all' || client.language === languageValue;
            
            return matchesSearch && matchesLanguage;
        });
        
        currentPage = 1;
        renderClients();
        renderPagination();
    }
    
    function renderClients() {
        if (filteredClients.length === 0) {
            clientsList.innerHTML = '<tr><td colspan="7">Aucun client trouvé</td></tr>';
            return;
        }
        
        const startIndex = (currentPage - 1) * clientsPerPage;
        const endIndex = Math.min(startIndex + clientsPerPage, filteredClients.length);
        const clientsToShow = filteredClients.slice(startIndex, endIndex);
        
        clientsList.innerHTML = '';
        
        clientsToShow.forEach(client => {
            const row = document.createElement('tr');
            
            // Formatage de la date
            const submissionDate = new Date(client.submission_date);
            const formattedDate = submissionDate.toLocaleDateString() + ' ' + 
                                 submissionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${client.main_driver_name}</td>
                <td>${client.main_driver_firstname}</td>
                <td>${client.main_driver_email}</td>
                <td>${client.main_driver_phone}</td>
                <td>${client.language === 'fr' ? 'Français' : 'Anglais'}</td>
                <td>
                    <span class="client-id" title="ID Client">${client.id}</span>
                </td>
                <td>
                    <button class="action-btn view-btn" data-id="${client.id}" title="Voir les détails">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn download-btn" data-id="${client.id}" title="Télécharger le PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="action-btn email-btn" data-id="${client.id}" title="Renvoyer par email">
                        <i class="fas fa-envelope"></i>
                    </button>
                </td>
            `;
            
            clientsList.appendChild(row);
        });
        
        // Ajout des événements pour les boutons d'action
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const clientId = this.getAttribute('data-id');
                showClientDetails(clientId);
            });
        });
        
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const clientId = this.getAttribute('data-id');
                window.open(`/api/download-pdf/${clientId}`, '_blank');
            });
        });
        
        document.querySelectorAll('.email-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const clientId = this.getAttribute('data-id');
                resendEmail(clientId);
            });
        });
    }
    
    function renderPagination() {
        const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Bouton précédent
        paginationHTML += `
            <button class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Pages
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Bouton suivant
        paginationHTML += `
            <button class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pagination.innerHTML = paginationHTML;
        
        // Ajout des événements pour les boutons de pagination
        document.querySelectorAll('.page-btn[data-page]').forEach(btn => {
            btn.addEventListener('click', function() {
                currentPage = parseInt(this.getAttribute('data-page'));
                renderClients();
                renderPagination();
            });
        });
        
        document.querySelector('.prev-btn').addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderClients();
                renderPagination();
            }
        });
        
        document.querySelector('.next-btn').addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                renderClients();
                renderPagination();
            }
        });
    }
    
    function showClientDetails(clientId) {
        selectedClientId = clientId;
        const client = allClients.find(c => c.id === clientId);
        
        if (!client) {
            return;
        }
        
        // Formatage de la date
        const submissionDate = new Date(client.submission_date);
        const formattedDate = submissionDate.toLocaleDateString() + ' ' + 
                             submissionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let detailsHTML = `
            <div class="detail-section">
                <h3>Informations générales</h3>
                <div class="detail-row">
                    <div class="detail-label">Date de soumission</div>
                    <div class="detail-value">${formattedDate}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Langue</div>
                    <div class="detail-value">${client.language === 'fr' ? 'Français' : 'Anglais'}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Conducteur Principal</h3>
                <div class="detail-row">
                    <div class="detail-label">Nom</div>
                    <div class="detail-value">${client.main_driver_name}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Prénoms</div>
                    <div class="detail-value">${client.main_driver_firstname}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Adresse</div>
                    <div class="detail-value">${client.main_driver_address}, ${client.main_driver_postal_code}, ${client.main_driver_city}, ${client.main_driver_country}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date de naissance</div>
                    <div class="detail-value">${client.main_driver_birth_date}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Lieu de naissance</div>
                    <div class="detail-value">${client.main_driver_birth_place}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Téléphone</div>
                    <div class="detail-value">${client.main_driver_phone}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${client.main_driver_email}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">N° du permis de conduire</div>
                    <div class="detail-value">${client.main_driver_license_number}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date d'émission du permis</div>
                    <div class="detail-value">${client.main_driver_license_issue_date}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date de validité du permis</div>
                    <div class="detail-value">${client.main_driver_license_validity_date}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Lieu d'émission du permis</div>
                    <div class="detail-value">${client.main_driver_license_issue_place}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Carte de Crédit</h3>
                <div class="detail-row">
                    <div class="detail-label">Numéro de carte</div>
                    <div class="detail-value">${client.main_driver_credit_card}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Date d'expiration</div>
                    <div class="detail-value">${client.main_driver_credit_card_expiry}</div>
                </div>
            </div>
        `;
        
        // Conducteur additionnel (si présent)
        if (client.has_additional_driver) {
            detailsHTML += `
                <div class="detail-section">
                    <h3>Conducteur Additionnel</h3>
                    <div class="detail-row">
                        <div class="detail-label">Nom</div>
                        <div class="detail-value">${client.additional_driver_name}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Prénoms</div>
                        <div class="detail-value">${client.additional_driver_firstname}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Adresse</div>
                        <div class="detail-value">${client.additional_driver_address}, ${client.additional_driver_postal_code}, ${client.additional_driver_city}, ${client.additional_driver_country}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date de naissance</div>
                        <div class="detail-value">${client.additional_driver_birth_date}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Lieu de naissance</div>
                        <div class="detail-value">${client.additional_driver_birth_place}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Téléphone</div>
                        <div class="detail-value">${client.additional_driver_phone}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${client.additional_driver_email}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">N° du permis de conduire</div>
                        <div class="detail-value">${client.additional_driver_license_number}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date d'émission du permis</div>
                        <div class="detail-value">${client.additional_driver_license_issue_date}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date de validité du permis</div>
                        <div class="detail-value">${client.additional_driver_license_validity_date}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Lieu d'émission du permis</div>
                        <div class="detail-value">${client.additional_driver_license_issue_place}</div>
                    </div>
                </div>
            `;
        }
        
        // Carte de crédit additionnelle (si présente)
        if (client.has_additional_credit_card) {
            detailsHTML += `
                <div class="detail-section">
                    <h3>Carte de Crédit Supplémentaire</h3>
                    <div class="detail-row">
                        <div class="detail-label">Numéro de carte</div>
                        <div class="detail-value">${client.additional_credit_card}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Date d'expiration</div>
                        <div class="detail-value">${client.additional_credit_card_expiry}</div>
                    </div>
                </div>
            `;
        }
        
        // Acceptation des conditions
        detailsHTML += `
            <div class="detail-section">
                <h3>Acceptation des conditions</h3>
                <div class="detail-row">
                    <div class="detail-label">Acceptation des amendes</div>
                    <div class="detail-value">${client.accept_fines ? 'Oui' : 'Non'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Acceptation du traitement des données</div>
                    <div class="detail-value">${client.accept_data_processing ? 'Oui' : 'Non'}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Signature</h3>
                <div class="detail-row">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${client.signature_date}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Nom</div>
                    <div class="detail-value">${client.signature_name}</div>
                </div>
            </div>
        `;
        
        clientDetails.innerHTML = detailsHTML;
        clientModal.style.display = 'block';
    }
    
    function resendEmail(clientId) {
        fetch(`/api/resend-email/${clientId}`, {
            method: 'POST'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur lors de l\'envoi de l\'email');
            }
            return response.json();
        })
        .then(data => {
            alert('Email renvoyé avec succès');
        })
        .catch(error => {
            console.error('Erreur:', error);
            alert('Une erreur est survenue lors de l\'envoi de l\'email');
        });
    }
    
    function exportClientsToCSV() {
        // Création du contenu CSV
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        // En-têtes
        csvContent += 'Date,Nom,Prénom,Email,Téléphone,Langue,Adresse,Permis de conduire\n';
        
        // Données
        filteredClients.forEach(client => {
            const row = [
                new Date(client.submission_date).toLocaleDateString(),
                client.main_driver_name,
                client.main_driver_firstname,
                client.main_driver_email,
                client.main_driver_phone,
                client.language === 'fr' ? 'Français' : 'Anglais',
                `${client.main_driver_address}, ${client.main_driver_postal_code}, ${client.main_driver_city}, ${client.main_driver_country}`,
                client.main_driver_license_number
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        // Création du lien de téléchargement
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `clients_raiatea_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        
        // Téléchargement
        link.click();
        
        // Nettoyage
        document.body.removeChild(link);
    }
});
