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
