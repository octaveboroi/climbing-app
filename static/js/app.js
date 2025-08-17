// static/js/app.js - JavaScript principal de l'application

// Variables globales
let currentUser = null;
let menuOpen = false;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeMenu();
    initializeHTMX();
    autoCloseFlashMessages();
});

// Initialisation générale
function initializeApp() {
    // Vérifier le statut de connexion
    fetch('/api/user/current')
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                updateUserInterface();
            }
        })
        .catch(error => console.error('Erreur lors de la vérification de connexion:', error));
}

function updateUserInterface() {
    if (currentUser) {
        // Mettre à jour l'interface selon le rôle
        document.body.classList.add(`role-${currentUser.role}`);
        
        // Personnaliser le menu selon le rôle
        const menuTitle = document.querySelector('#menuOverlay h2');
        if (menuTitle) {
            menuTitle.textContent = `${currentUser.prenom} ${currentUser.nom}`;
        }
    }
}

// Gestion du menu hamburger
function initializeMenu() {
    const hamburger = document.querySelector('.hamburger');
    const menuOverlay = document.getElementById('menuOverlay');
    const backdrop = document.getElementById('backdrop');
    
    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', closeMenu);
    }
    
    // Fermer le menu avec Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menuOpen) {
            closeMenu();
        }
    });
}

function toggleMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const backdrop = document.getElementById('backdrop');
    
    if (menuOpen) {
        closeMenu();
    } else {
        openMenu();
    }
}

function openMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const backdrop = document.getElementById('backdrop');
    
    if (menuOverlay && backdrop) {
        menuOverlay.classList.add('active');
        backdrop.classList.add('active');
        menuOpen = true;
        
        // Empêcher le scroll sur le body
        document.body.style.overflow = 'hidden';
    }
}

function closeMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const backdrop = document.getElementById('backdrop');
    
    if (menuOverlay && backdrop) {
        menuOverlay.classList.remove('active');
        backdrop.classList.remove('active');
        menuOpen = false;
        
        // Réactiver le scroll sur le body
        document.body.style.overflow = '';
    }
}

// Configuration HTMX
function initializeHTMX() {
    // Configuration globale HTMX
    htmx.config.timeout = 10000; // 10 secondes
    htmx.config.requestTimeout = 15000; // 15 secondes
    
    // Intercepter les erreurs HTMX
    htmx.on('htmx:responseError', function(evt) {
        console.error('Erreur HTMX:', evt.detail);
        showNotification('Erreur de connexion au serveur', 'error');
    });
    
    // Intercepter les requêtes HTMX
    htmx.on('htmx:beforeRequest', function(evt) {
        // Ajouter un spinner ou une indication de chargement
        const target = evt.target;
        if (target) {
            target.classList.add('loading');
        }
    });
    
    htmx.on('htmx:afterRequest', function(evt) {
        // Retirer le spinner
        const target = evt.target;
        if (target) {
            target.classList.remove('loading');
        }
        
        // Gérer les réponses de connexion
        if (evt.detail.xhr.responseURL && evt.detail.xhr.responseURL.includes('/api/login')) {
            handleLoginResponse(evt.detail.xhr);
        }
    });
}

function handleLoginResponse(xhr) {
    try {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
            // Redirection selon le rôle
            const role = response.user.role;
            if (role === 'admin' || role === 'ouvreur') {
                window.location.href = '/admin/dashboard';
            } else {
                window.location.href = '/grimpeur/dashboard';
            }
        } else {
            showNotification(response.message || 'Erreur de connexion', 'error');
        }
    } catch (e) {
        showNotification('Erreur de traitement de la réponse', 'error');
    }
}

// Système de notifications
function showNotification(message, type = 'info', duration = 5000) {
    // Créer l'élément notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300`;
    
    // Couleurs selon le type
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-black',
        info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 font-bold text-lg">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Suppression automatique
    if (duration > 0) {
        setTimeout(() => {
            notification.style.transform = 'translateX(full)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

function autoCloseFlashMessages() {
    const flashMessages = document.getElementById('flash-messages');
    if (flashMessages) {
        setTimeout(() => {
            flashMessages.style.opacity = '0';
            setTimeout(() => flashMessages.remove(), 300);
        }, 5000);
    }
}

// Utilitaires généraux
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatScore(score) {
    return Math.round(score * 100) / 100;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validation de formulaires
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('border-red-500');
            isValid = false;
        } else {
            field.classList.remove('border-red-500');
        }
    });
    
    return isValid;
}

// Gestion des uploads
function handleFileUpload(inputElement, previewElement, maxSize = 16 * 1024 * 1024) {
    const file = inputElement.files[0];
    
    if (!file) return;
    
    if (file.size > maxSize) {
        showNotification('Fichier trop volumineux (max 16MB)', 'error');
        inputElement.value = '';
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showNotification('Veuillez sélectionner une image', 'error');
        inputElement.value = '';
        return;
    }
    
    // Prévisualisation
    if (previewElement) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewElement.src = e.target.result;
            previewElement.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Gestion des touches
document.addEventListener('keydown', function(e) {
    // Fermer les modales avec Escape
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active, .menu-overlay.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
            if (modal.classList.contains('menu-overlay')) {
                closeMenu();
            }
        });
    }
});

// static/js/voie-editor.js - Éditeur de voies avancé

class VoieEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.image = null;
        this.circles = [];
        this.selectedCircle = null;
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.nextOrder = 1;
        this.isDragging = false;
        this.isResizing = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.createToolbar();
    }
    
    setupEventListeners() {
        // Gestion du zoom avec la molette
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom(delta, e.clientX, e.clientY);
        });
        
        // Double-clic pour ajouter un cercle
        this.container.addEventListener('dblclick', (e) => {
            if (e.target === this.image) {
                this.addCircleAtPosition(e.clientX, e.clientY);
            }
        });
        
        // Gestion tactile
        this.setupTouchEvents();
    }
    
    setupTouchEvents() {
        let touches = {};
        let initialDistance = 0;
        let initialScale = 1;
        
        this.container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touches = {};
            
            for (let touch of e.touches) {
                touches[touch.identifier] = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }
            
            if (e.touches.length === 2) {
                // Zoom à deux doigts
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                initialScale = this.scale;
            }
        });
        
        this.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 2) {
                // Zoom
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
                
                const scaleChange = currentDistance / initialDistance;
                this.scale = Math.max(0.3, Math.min(4, initialScale * scaleChange));
                this.updateTransform();
            } else if (e.touches.length === 1) {
                // Pan
                const touch = e.touches[0];
                const prevTouch = touches[touch.identifier];
                
                if (prevTouch) {
                    const deltaX = touch.clientX - prevTouch.x;
                    const deltaY = touch.clientY - prevTouch.y;
                    
                    this.translateX += deltaX;
                    this.translateY += deltaY;
                    this.updateTransform();
                }
                
                touches[touch.identifier] = {
                    x: touch.clientX,
                    y: touch.clientY
                };
            }
        });
    }
    
    createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'voie-editor-toolbar fixed top-20 left-4 bg-white p-2 rounded-lg shadow-lg z-50';
        toolbar.innerHTML = `
            <div class="flex flex-col gap-2">
                <button onclick="voieEditor.zoomIn()" class="p-2 bg-blue-500 text-white rounded">🔍+</button>
                <button onclick="voieEditor.zoomOut()" class="p-2 bg-blue-500 text-white rounded">🔍-</button>
                <button onclick="voieEditor.resetView()" class="p-2 bg-gray-500 text-white rounded">⌂</button>
                <button onclick="voieEditor.deleteSelected()" class="p-2 bg-red-500 text-white rounded">🗑️</button>
                <button onclick="voieEditor.reorderCircles()" class="p-2 bg-green-500 text-white rounded">🔢</button>
            </div>
        `;
        document.body.appendChild(toolbar);
    }
    
    loadImage(imageSrc) {
        if (this.image) {
            this.image.remove();
        }
        
        this.image = document.createElement('img');
        this.image.src = imageSrc;
        this.image.className = 'max-w-none';
        this.image.style.transformOrigin = '0 0';
        
        this.image.onload = () => {
            this.container.appendChild(this.image);
            this.resetView();
        };
    }
    
    addCircleAtPosition(clientX, clientY) {
        const containerRect = this.container.getBoundingClientRect();
        const imageRect = this.image.getBoundingClientRect();
        
        // Convertir les coordonnées écran en coordonnées image
        const x = ((clientX - imageRect.left) / imageRect.width) * 100;
        const y = ((clientY - imageRect.top) / imageRect.height) * 100;
        
        if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
            this.addCircle(x, y, 5, this.nextOrder++);
        }
    }
    
    addCircle(x, y, radius, order, id = null) {
        const circle = document.createElement('div');
        circle.className = 'circle-editor absolute border-2 border-red-500 bg-red-200 bg-opacity-30 rounded-full cursor-pointer flex items-center justify-center font-bold text-red-700 select-none';
        circle.style.left = `${x}%`;
        circle.style.top = `${y}%`;
        circle.style.width = `${radius}%`;
        circle.style.height = `${radius}%`;
        circle.textContent = order;
        
        circle.dataset.x = x;
        circle.dataset.y = y;
        circle.dataset.radius = radius;
        circle.dataset.order = order;
        circle.dataset.id = id || `temp_${Date.now()}_${Math.random()}`;
        
        // Événements du cercle
        circle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectCircle(circle);
        });
        
        circle.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Clic gauche
                this.startDragging(circle, e);
            }
        });
        
        // Menu contextuel
        circle.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(circle, e.clientX, e.clientY);
        });
        
        this.container.appendChild(circle);
        this.circles.push(circle);
        
        return circle;
    }
    
    selectCircle(circle) {
        // Désélectionner les autres
        this.circles.forEach(c => {
            c.classList.remove('selected');
            c.style.borderColor = '#ef4444';
            c.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
        });
        
        // Sélectionner le cercle
        circle.classList.add('selected');
        circle.style.borderColor = '#3b82f6';
        circle.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
        
        this.selectedCircle = circle;
    }
    
    startDragging(circle, e) {
        this.isDragging = true;
        this.selectCircle(circle);
        
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseFloat(circle.dataset.x);
        const startTop = parseFloat(circle.dataset.y);
        
        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const imageRect = this.image.getBoundingClientRect();
            const newX = startLeft + (deltaX / imageRect.width) * 100;
            const newY = startTop + (deltaY / imageRect.height) * 100;
            
            // Limiter aux bordures de l'image
            const clampedX = Math.max(0, Math.min(100, newX));
            const clampedY = Math.max(0, Math.min(100, newY));
            
            circle.style.left = `${clampedX}%`;
            circle.style.top = `${clampedY}%`;
            circle.dataset.x = clampedX;
            circle.dataset.y = clampedY;
        };
        
        const onMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    showContextMenu(circle, x, y) {
        // Supprimer les menus existants
        document.querySelectorAll('.circle-context-menu').forEach(menu => menu.remove());
        
        const menu = document.createElement('div');
        menu.className = 'circle-context-menu fixed bg-white border shadow-lg rounded z-50 py-2';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        menu.innerHTML = `
            <button onclick="voieEditor.resizeCircle('${circle.dataset.id}')" class="block w-full px-4 py-2 text-left hover:bg-gray-100">
                📏 Redimensionner
            </button>
            <button onclick="voieEditor.changeOrder('${circle.dataset.id}')" class="block w-full px-4 py-2 text-left hover:bg-gray-100">
                🔢 Changer ordre
            </button>
            <button onclick="voieEditor.deleteCircle('${circle.dataset.id}')" class="block w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600">
                🗑️ Supprimer
            </button>
        `;
        
        document.body.appendChild(menu);
        
        // Fermer le menu en cliquant ailleurs
        setTimeout(() => {
            document.addEventListener('click', () => {
                menu.remove();
            }, { once: true });
        }, 10);
    }
    
    resizeCircle(circleId) {
        const circle = this.circles.find(c => c.dataset.id === circleId);
        if (!circle) return;
        
        const currentRadius = parseFloat(circle.dataset.radius);
        const newRadius = prompt('Nouveau rayon (%)', currentRadius);
        
        if (newRadius && !isNaN(newRadius) && newRadius > 0 && newRadius <= 20) {
            circle.style.width = `${newRadius}%`;
            circle.style.height = `${newRadius}%`;
            circle.dataset.radius = newRadius;
        }
    }
    
    changeOrder(circleId) {
        const circle = this.circles.find(c => c.dataset.id === circleId);
        if (!circle) return;
        
        const currentOrder = parseInt(circle.dataset.order);
        const newOrder = prompt('Nouvel ordre', currentOrder);
        
        if (newOrder && !isNaN(newOrder) && newOrder > 0) {
            circle.dataset.order = newOrder;
            circle.textContent = newOrder;
            this.reorderCircles();
        }
    }
    
    deleteCircle(circleId) {
        const circle = this.circles.find(c => c.dataset.id === circleId);
        if (!circle) return;
        
        if (confirm('Supprimer ce cercle ?')) {
            circle.remove();
            this.circles = this.circles.filter(c => c.dataset.id !== circleId);
            this.reorderCircles();
        }
    }
    
    deleteSelected() {
        if (this.selectedCircle) {
            this.deleteCircle(this.selectedCircle.dataset.id);
        }
    }
    
    reorderCircles() {
        // Trier les cercles par position Y puis X
        this.circles.sort((a, b) => {
            const yDiff = parseFloat(a.dataset.y) - parseFloat(b.dataset.y);
            if (Math.abs(yDiff) > 5) { // Tolérance de 5%
                return yDiff;
            }
            return parseFloat(a.dataset.x) - parseFloat(b.dataset.x);
        });
        
        // Réassigner les ordres
        this.circles.forEach((circle, index) => {
            const newOrder = index + 1;
            circle.dataset.order = newOrder;
            circle.textContent = newOrder;
        });
        
        this.nextOrder = this.circles.length + 1;
    }
    
    zoom(factor, centerX = null, centerY = null) {
        const newScale = Math.max(0.3, Math.min(4, this.scale * factor));
        
        if (centerX !== null && centerY !== null) {
            // Zoom centré sur le point spécifié
            const containerRect = this.container.getBoundingClientRect();
            const relativeX = centerX - containerRect.left;
            const relativeY = centerY - containerRect.top;
            
            const scaleChange = newScale / this.scale;
            this.translateX = relativeX - (relativeX - this.translateX) * scaleChange;
            this.translateY = relativeY - (relativeY - this.translateY) * scaleChange;
        }
        
        this.scale = newScale;
        this.updateTransform();
    }
    
    zoomIn() {
        this.zoom(1.3);
    }
    
    zoomOut() {
        this.zoom(1/1.3);
    }
    
    resetView() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.updateTransform();
    }
    
    updateTransform() {
        if (this.image) {
            this.image.style.transform = `scale(${this.scale}) translate(${this.translateX/this.scale}px, ${this.translateY/this.scale}px)`;
        }
    }
    
    getCirclesData() {
        return this.circles.map(circle => ({
            id: circle.dataset.id.startsWith('temp_') ? null : circle.dataset.id,
            x: parseFloat(circle.dataset.x),
            y: parseFloat(circle.dataset.y),
            radius: parseFloat(circle.dataset.radius),
            order: parseInt(circle.dataset.order)
        }));
    }
    
    loadCircles(circlesData) {
        // Supprimer les cercles existants
        this.circles.forEach(circle => circle.remove());
        this.circles = [];
        
        // Charger les nouveaux cercles
        circlesData.forEach(data => {
            this.addCircle(data.x, data.y, data.radius, data.order, data.id);
        });
        
        this.nextOrder = Math.max(...circlesData.map(c => c.order), 0) + 1;
    }
    
    reset() {
        this.circles.forEach(circle => circle.remove());
        this.circles = [];
        this.nextOrder = 1;
        this.selectedCircle = null;
        this.resetView();
    }
}

// Instance globale de l'éditeur
let voieEditor = null;

// static/js/classement.js - Gestion des classements

class ClassementManager {
    constructor() {
        this.currentCompetition = null;
        this.categories = [];
        this.classements = {};
        this.displayMode = 'mobile'; // mobile ou carousel
    }
    
    loadClassement(competitionId) {
        this.currentCompetition = competitionId;
        
        fetch(`/api/competition/${competitionId}/classement`)
            .then(response => response.json())
            .then(data => {
                this.classements = data;
                this.categories = Object.keys(data);
                this.renderClassement();
            })
            .catch(error => {
                console.error('Erreur chargement classement:', error);
                showNotification('Erreur lors du chargement du classement', 'error');
            });
    }
    
    renderClassement() {
        const container = document.getElementById('classement-container');
        if (!container) return;
        
        if (this.displayMode === 'carousel') {
            this.renderCarousel(container);
        } else {
            this.renderMobile(container);
        }
    }
    
    renderMobile(container) {
        container.innerHTML = `
            <div class="space-y-6">
                ${this.categories.map(categorie => this.renderCategorieCard(categorie)).join('')}
            </div>
        `;
    }
    
    renderCarousel(container) {
        container.innerHTML = `
            <div class="carousel-container h-screen bg-gray-900 text-white relative overflow-hidden">
                <div class="carousel-slides flex transition-transform duration-500" id="carousel-slides">
                    ${this.categories.map(categorie => this.renderCarouselSlide(categorie)).join('')}
                </div>
                <div class="carousel-controls absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <button onclick="classementManager.prevSlide()" class="bg-white bg-opacity-20 p-2 rounded-full mx-2">‹</button>
                    <button onclick="classementManager.nextSlide()" class="bg-white bg-opacity-20 p-2 rounded-full mx-2">›</button>
                </div>
                <div class="carousel-indicators absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    ${this.categories.map((_, i) => `<div class="w-2 h-2 bg-white bg-opacity-50 rounded-full cursor-pointer" onclick="classementManager.goToSlide(${i})"></div>`).join('')}
                </div>
            </div>
        `;
        
        // Auto-rotation du carousel
        this.startCarousel();
    }
    
    renderCategorieCard(categorie) {
        const grimpeurs = this.classements[categorie] || [];
        
        return `
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                <div class="bg-blue-600 text-white p-4">
                    <h3 class="text-xl font-bold">${categorie}</h3>
                    <p class="text-blue-200">${grimpeurs.length} participant(s)</p>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left">Position</th>
                                <th class="px-4 py-3 text-left">Grimpeur</th>
                                <th class="px-4 py-3 text-right">Score</th>
                                <th class="px-4 py-3 text-right">Voies</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grimpeurs.map(grimpeur => this.renderGrimpeurRow(grimpeur)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    renderGrimpeurRow(grimpeur) {
        const positionClass = this.getPositionClass(grimpeur.position);
        
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3">
                    <span class="position-badge ${positionClass}">${grimpeur.position}</span>
                </td>
                <td class="px-4 py-3 font-medium">${grimpeur.grimpeur}</td>
                <td class="px-4 py-3 text-right font-bold">${formatScore(grimpeur.score_total)}</td>
                <td class="px-4 py-3 text-right">${grimpeur.nb_voies}</td>
            </tr>
        `;
    }
    
    renderCarouselSlide(categorie) {
        const grimpeurs = this.classements[categorie] || [];
        
        return `
            <div class="carousel-slide w-full h-full flex-shrink-0 p-8 flex flex-col justify-center">
                <div class="text-center mb-8">
                    <h2 class="text-4xl font-bold mb-2">${categorie}</h2>
                    <p class="text-2xl opacity-80">${grimpeurs.length} participant(s)</p>
                </div>
                <div class="grid gap-6 max-w-4xl mx-auto">
                    ${grimpeurs.slice(0, 10).map((grimpeur, index) => `
                        <div class="flex items-center justify-between bg-white bg-opacity-10 rounded-lg p-4">
                            <div class="flex items-center">
                                <span class="position-badge ${this.getPositionClass(grimpeur.position)} mr-4">${grimpeur.position}</span>
                                <span class="text-2xl font-semibold">${grimpeur.grimpeur}</span>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold">${formatScore(grimpeur.score_total)}</div>
                                <div class="text-sm opacity-80">${grimpeur.nb_voies} voies</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    getPositionClass(position) {
        switch(position) {
            case 1: return 'position-1';
            case 2: return 'position-2';
            case 3: return 'position-3';
            default: return 'position-other';
        }
    }
    
    setDisplayMode(mode) {
        this.displayMode = mode;
        this.renderClassement();
    }
    
    // Méthodes pour le carousel
    currentSlide = 0;
    carouselTimer = null;
    
    startCarousel() {
        this.carouselTimer = setInterval(() => {
            this.nextSlide();
        }, 10000); // 10 secondes par slide
    }
    
    stopCarousel() {
        if (this.carouselTimer) {
            clearInterval(this.carouselTimer);
            this.carouselTimer = null;
        }
    }
    
    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.categories.length;
        this.updateCarousel();
    }
    
    prevSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.categories.length) % this.categories.length;
        this.updateCarousel();
    }
    
    goToSlide(index) {
        this.currentSlide = index;
        this.updateCarousel();
        this.stopCarousel();
        this.startCarousel(); // Redémarrer le timer
    }
    
    updateCarousel() {
        const slides = document.getElementById('carousel-slides');
        if (slides) {
            slides.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        }
        
        // Mettre à jour les indicateurs
        document.querySelectorAll('.carousel-indicators > div').forEach((indicator, index) => {
            if (index === this.currentSlide) {
                indicator.classList.remove('bg-opacity-50');
                indicator.classList.add('bg-opacity-100');
            } else {
                indicator.classList.remove('bg-opacity-100');
                indicator.classList.add('bg-opacity-50');
            }
        });
    }
}

// Instance globale du gestionnaire de classement
let classementManager = new ClassementManager();

// Fonctions utilitaires export
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatScore = formatScore;
window.toggleMenu = toggleMenu;
window.openMenu = openMenu;
window.closeMenu = closeMenu;
