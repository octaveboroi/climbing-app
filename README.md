GUIDE D'UTILISATION
===================

Application de gestion de compétitions d'escalade indoor
=======================================================

Cette application permet de gérer des compétitions d'escalade avec:
- 3 types d'utilisateurs: Admin, Ouvreur, Grimpeur
- Gestion des voies avec photos et cercles interactifs
- Système de validation par zones (cercles)
- Calcul automatique des scores
- Interface responsive (mobile-first)
- Connexion par codes à 6 chiffres


Fonctionnalités:
- CRUD complet pour tous les éléments
- Zoom/Pan sur les photos de voies
- Validation tactile pour grimpeurs
- Classements en temps réel
- Interface publique d'inscription
- Affichage public des classements



1. Installation:
    pip install -r requirements.txt
    python app.py

2. Premier lancement:
   - L'application créera automatiquement la base de données
   - Un code administrateur sera affiché dans la console
   - Accéder à http://localhost:5000

3. Utilisation:
   - Admin/Ouvreurs: Gestion complète via interface web
   - Grimpeurs: Connexion avec code 6 chiffres le jour J
   - Interface responsive adaptée mobile/tablette

4. Structure des fichiers:
   ```
climbing_app/
├── app.py                          # Application Flask principale
├── models.py                       # Modèles de base de données
├── routes.py                       # Routes API
├── config.py                       # Configuration
├── requirements.txt                # Dépendances Python
├── static/
│   ├── css/
│   │   └── custom.css             # Styles personnalisés
│   ├── js/
│   │   ├── app.js                 # JavaScript principal
│   │   ├── voie-editor.js         # Éditeur de voies
│   │   └── classement.js          # Interface classement
│   └── uploads/                   # Images des voies
└── templates/
    ├── base.html                  # Template de base
    ├── index.html                 # Page d'accueil
    ├── login.html                 # Page de connexion
    ├── admin/
    │   ├── dashboard.html         # Dashboard admin
    │   ├── competitions.html      # Gestion compétitions
    │   ├── voies.html            # Gestion voies
    │   ├── users.html            # Gestion utilisateurs
    │   └── categories.html        # Gestion catégories
    ├── grimpeur/
    │   ├── dashboard.html         # Dashboard grimpeur
    │   ├── voies.html            # Liste des voies
    │   ├── voie-detail.html      # Détail d'une voie
    │   ├── profile.html          # Profil utilisateur
    │   └── classement.html       # Classement
    └── public/
        ├── inscription.html       # Inscription publique
        └── classement-display.html # Affichage public classement

   ```

5. Fonctionnalités clés:
   - ✅ Gestion complète des compétitions
   - ✅ Upload et édition de voies avec cercles
   - ✅ Validation tactile sur mobile
   - ✅ Calcul automatique des scores
   - ✅ Classements en temps réel
   - ✅ Interface responsive (mobile-first)
   - ✅ Codes de connexion sécurisés
   - ✅ Connexion multiple (parents/enfants)

6. Configuration production:
   - Modifier SECRET_KEY dans les variables d'environnement
   - Utiliser une base PostgreSQL/MySQL
   - Configurer un serveur web (nginx + gunicorn)
   - Activer HTTPS
   - Sauvegardes automatiques

7. API Endpoints principaux:
   - GET /api/user/current - Utilisateur connecté
   - POST /api/login - Connexion
   - GET /api/voies/list - Liste des voies
   - POST /api/validate - Validation grimpeur
   - GET /api/competition/{id}/classement - Classements

SÉCURITÉ:
- Codes de connexion uniques générés par hash
- Sessions sécurisées avec timeout
- Validation des uploads d'images
- Protection CSRF avec Flask
- Logs d'audit des actions importantes



