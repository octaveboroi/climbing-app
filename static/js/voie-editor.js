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
