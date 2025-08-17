# routes.py - Routes API complètes pour l'application d'escalade

from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime, date
from models import db, User, Competition, Voie, Circle, Level, Categorie, ValidationGrimpeur, CompetitionCategorie, CompetitionVoie, InscriptionCompetition

# Création des blueprints
api_bp = Blueprint('api', __name__, url_prefix='/api')
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')
grimpeur_bp = Blueprint('grimpeur', __name__, url_prefix='/grimpeur')

# Décorateurs pour vérifier les rôles
def require_login(f):
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Non connecté'}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

def require_admin_or_ouvreur(f):
    def wrapper(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') not in ['admin', 'ouvreur']:
            return jsonify({'error': 'Accès non autorisé'}), 403
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

def require_admin(f):
    def wrapper(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Accès administrateur requis'}), 403
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# Routes API générales
@api_bp.route('/user/current')
def get_current_user():
    if 'user_id' not in session:
        return jsonify({'user': None})
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'user': None})
    
    return jsonify({
        'user': {
            'id': user.id,
            'nom': user.nom,
            'prenom': user.prenom,
            'role': user.role,
            'email': user.email
        }
    })

@api_bp.route('/login', methods=['POST'])
def api_login():
    data = request.get_json()
    code = data.get('code')
    
    user = User.query.filter_by(code_connexion=code).first()
    
    if user:
        session['user_id'] = user.id
        session['user_role'] = user.role
        return jsonify({'success': True, 'user': {'role': user.role}})
    
    return jsonify({'success': False, 'message': 'Code invalide'}), 400

# Routes pour les grimpeurs
@api_bp.route('/grimpeur/competitions')
@require_login
def get_grimpeur_competitions():
    # Récupérer les compétitions du jour où le grimpeur est inscrit
    user_id = session['user_id']
    today = datetime.now().date()
    
    competitions = db.session.query(Competition).join(InscriptionCompetition)\
        .filter(InscriptionCompetition.grimpeur_id == user_id)\
        .filter(Competition.date_debut <= datetime.combine(today, datetime.max.time()))\
        .filter(Competition.date_fin >= datetime.combine(today, datetime.min.time()))\
        .filter(Competition.is_open == True)\
        .all()
    
    result = []
    for comp in competitions:
        nb_inscrits = InscriptionCompetition.query.filter_by(competition_id=comp.id).count()
        result.append({
            'id': comp.id,
            'nom': comp.nom,
            'date_debut': comp.date_debut.strftime('%d/%m/%Y %H:%M'),
            'date_fin': comp.date_fin.strftime('%d/%m/%Y %H:%M'),
            'nb_inscrits': nb_inscrits
        })
    
    return jsonify(result)

@api_bp.route('/voies/list')
@require_login
def get_voies_list():
    user_id = session['user_id']
    competition_id = request.args.get('competition_id')
    
    if not competition_id:
        return jsonify({'error': 'competition_id requis'}), 400
    
    # Récupérer les voies de la compétition
    voies = db.session.query(Voie).join(CompetitionVoie)\
        .filter(CompetitionVoie.competition_id == competition_id)\
        .all()
    
    result = []
    for voie in voies:
        # Vérifier si le grimpeur a validé cette voie
        validation = ValidationGrimpeur.query.filter_by(
            grimpeur_id=user_id,
            voie_id=voie.id,
            competition_id=competition_id
        ).first()
        
        result.append({
            'id': voie.id,
            'nom': voie.nom,
            'level_name': voie.level.nom if voie.level else 'N/A',
            'image_path': voie.image_path or '/static/default-climb.jpg',
            'validated': validation is not None
        })
    
    return jsonify(result)

@api_bp.route('/voie/<int:voie_id>')
@require_login
def get_voie_details(voie_id):
    voie = Voie.query.get_or_404(voie_id)
    
    circles = Circle.query.filter_by(voie_id=voie_id).order_by(Circle.ordre).all()
    
    return jsonify({
        'id': voie.id,
        'nom': voie.nom,
        'level_name': voie.level.nom if voie.level else 'N/A',
        'image_path': voie.image_path or '/static/default-climb.jpg',
        'commentaire': voie.commentaire,
        'circles': [{
            'id': circle.id,
            'x': circle.x,
            'y': circle.y,
            'radius': circle.radius,
            'ordre': circle.ordre
        } for circle in circles]
    })

@api_bp.route('/validate', methods=['POST'])
@require_login
def validate_grimpeur():
    data = request.get_json()
    user_id = session['user_id']
    
    circle_id = data.get('circle_id')
    voie_id = data.get('voie_id')
    competition_id = data.get('competition_id')
    
    if not all([circle_id, voie_id, competition_id]):
        return jsonify({'success': False, 'message': 'Données manquantes'}), 400
    
    # Vérifier si le grimpeur est inscrit à la compétition
    inscription = InscriptionCompetition.query.filter_by(
        grimpeur_id=user_id,
        competition_id=competition_id
    ).first()
    
    if not inscription:
        return jsonify({'success': False, 'message': 'Non inscrit à cette compétition'}), 403
    
    # Vérifier si une validation existe déjà pour cette voie
    existing = ValidationGrimpeur.query.filter_by(
        grimpeur_id=user_id,
        voie_id=voie_id,
        competition_id=competition_id
    ).first()
    
    if existing:
        # Mettre à jour la validation existante
        existing.circle_id = circle_id
        existing.datetime_creation = datetime.utcnow()
    else:
        # Créer une nouvelle validation
        validation = ValidationGrimpeur(
            grimpeur_id=user_id,
            voie_id=voie_id,
            competition_id=competition_id,
            circle_id=circle_id
        )
        db.session.add(validation)
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Routes pour l'administration des voies
@api_bp.route('/admin/voies')
@require_admin_or_ouvreur
def get_admin_voies():
    voies = Voie.query.all()
    
    result = []
    for voie in voies:
        result.append({
            'id': voie.id,
            'nom': voie.nom,
            'level_name': voie.level.nom if voie.level else 'N/A',
            'level_score': voie.level.score if voie.level else 0,
            'image_path': voie.image_path,
            'commentaire': voie.commentaire,
            'date_creation': voie.date_creation.strftime('%d/%m/%Y'),
            'nb_circles': voie.circles.count()
        })
    
    return jsonify(result)

@api_bp.route('/admin/levels')
@require_admin_or_ouvreur
def get_levels():
    levels = Level.query.order_by(Level.score.desc()).all()
    
    return jsonify([{
        'id': level.id,
        'nom': level.nom,
        'score': level.score
    } for level in levels])

@api_bp.route('/voie/create', methods=['POST'])
@require_admin_or_ouvreur
def create_voie():
    nom = request.form.get('nom')
    level_id = request.form.get('level_id')
    commentaire = request.form.get('commentaire', '')
    circles_data = request.form.get('circles', '[]')
    
    if not nom or not level_id:
        return jsonify({'success': False, 'message': 'Nom et niveau requis'}), 400
    
    # Gérer l'upload de l'image
    image_path = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename:
            filename = secure_filename(file.filename)
            # Ajouter un timestamp pour éviter les conflits
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}"
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            
            # Créer le dossier s'il n'existe pas
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            file.save(file_path)
            image_path = f"/static/uploads/{filename}"
    
    # Créer la voie
    voie = Voie(
        nom=nom,
        level_id=int(level_id),
        commentaire=commentaire,
        image_path=image_path
    )
    
    db.session.add(voie)
    
    try:
        db.session.flush()  # Pour obtenir l'ID de la voie
        
        # Ajouter les cercles
        circles = json.loads(circles_data)
        for circle_data in circles:
            circle = Circle(
                x=float(circle_data['x']),
                y=float(circle_data['y']),
                radius=float(circle_data['radius']),
                ordre=int(circle_data['order']),
                voie_id=voie.id
            )
            db.session.add(circle)
        
        db.session.commit()
        return jsonify({'success': True, 'voie_id': voie.id})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@api_bp.route('/voie/<int:voie_id>/update', methods=['POST'])
@require_admin_or_ouvreur
def update_voie(voie_id):
    voie = Voie.query.get_or_404(voie_id)
    
    # Vérifier si la voie peut être modifiée (pas dans une compétition ouverte)
    competition_ouverte = db.session.query(Competition).join(CompetitionVoie)\
        .filter(CompetitionVoie.voie_id == voie_id)\
        .filter(Competition.is_open == True)\
        .first()
    
    if competition_ouverte:
        return jsonify({'success': False, 'message': 'Impossible de modifier une voie dans une compétition ouverte'}), 403
    
    nom = request.form.get('nom')
    level_id = request.form.get('level_id')
    commentaire = request.form.get('commentaire', '')
    circles_data = request.form.get('circles', '[]')
    
    if nom:
        voie.nom = nom
    if level_id:
        voie.level_id = int(level_id)
    voie.commentaire = commentaire
    
    try:
        # Supprimer les anciens cercles
        Circle.query.filter_by(voie_id=voie_id).delete()
        
        # Ajouter les nouveaux cercles
        circles = json.loads(circles_data)
        for circle_data in circles:
            circle = Circle(
                x=float(circle_data['x']),
                y=float(circle_data['y']),
                radius=float(circle_data['radius']),
                ordre=int(circle_data['order']),
                voie_id=voie_id
            )
            db.session.add(circle)
        
        db.session.commit()
        return jsonify({'success': True})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Routes pour les compétitions
@api_bp.route('/admin/competitions')
@require_admin_or_ouvreur
def get_competitions():
    competitions = Competition.query.order_by(Competition.date_creation.desc()).all()
    
    result = []
    for comp in competitions:
        nb_inscrits = InscriptionCompetition.query.filter_by(competition_id=comp.id).count()
        nb_voies = CompetitionVoie.query.filter_by(competition_id=comp.id).count()
        
        categories = db.session.query(Categorie).join(CompetitionCategorie)\
            .filter(CompetitionCategorie.competition_id == comp.id).all()
        
        result.append({
            'id': comp.id,
            'nom': comp.nom,
            'date_debut': comp.date_debut.strftime('%d/%m/%Y %H:%M'),
            'date_fin': comp.date_fin.strftime('%d/%m/%Y %H:%M'),
            'nb_participant_max': comp.nombre_participant_max,
            'nb_inscrits': nb_inscrits,
            'nb_voies': nb_voies,
            'is_open': comp.is_open,
            'inscription_is_open': comp.inscription_is_open,
            'categories': [cat.nom for cat in categories],
            'status': 'En cours' if comp.is_open else 'Fermée'
        })
    
    return jsonify(result)

@api_bp.route('/competition/create', methods=['POST'])
@require_admin_or_ouvreur
def create_competition():
    data = request.get_json()
    
    nom = data.get('nom')
    date_debut = datetime.fromisoformat(data.get('date_debut'))
    date_fin = datetime.fromisoformat(data.get('date_fin'))
    nombre_participant_max = data.get('nombre_participant_max', 100)
    categories_ids = data.get('categories', [])
    is_open = data.get('is_open', False)
    inscription_is_open = data.get('inscription_is_open', False)
    
    if not all([nom, date_debut, date_fin]):
        return jsonify({'success': False, 'message': 'Données manquantes'}), 400
    
    if date_debut >= date_fin:
        return jsonify({'success': False, 'message': 'Date de fin doit être après date de début'}), 400
    
    competition = Competition(
        nom=nom,
        date_debut=date_debut,
        date_fin=date_fin,
        nombre_participant_max=nombre_participant_max,
        is_open=is_open,
        inscription_is_open=inscription_is_open
    )
    
    db.session.add(competition)
    
    try:
        db.session.flush()
        
        # Ajouter les catégories
        for cat_id in categories_ids:
            comp_cat = CompetitionCategorie(
                competition_id=competition.id,
                categorie_id=cat_id
            )
            db.session.add(comp_cat)
        
        db.session.commit()
        return jsonify({'success': True, 'competition_id': competition.id})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@api_bp.route('/competition/<int:comp_id>/voies', methods=['GET', 'POST'])
@require_admin_or_ouvreur
def manage_competition_voies(comp_id):
    competition = Competition.query.get_or_404(comp_id)
    
    if request.method == 'GET':
        # Récupérer les voies de la compétition
        voies = db.session.query(Voie).join(CompetitionVoie)\
            .filter(CompetitionVoie.competition_id == comp_id)\
            .all()
        
        return jsonify([{
            'id': voie.id,
            'nom': voie.nom,
            'level_name': voie.level.nom if voie.level else 'N/A',
            'level_score': voie.level.score if voie.level else 0
        } for voie in voies])
    
    elif request.method == 'POST':
        # Ajouter/Supprimer des voies
        if competition.is_open:
            return jsonify({'success': False, 'message': 'Impossible de modifier les voies d\'une compétition ouverte'}), 403
        
        data = request.get_json()
        voies_ids = data.get('voies_ids', [])
        
        # Supprimer les anciennes associations
        CompetitionVoie.query.filter_by(competition_id=comp_id).delete()
        
        # Ajouter les nouvelles
        for voie_id in voies_ids:
            comp_voie = CompetitionVoie(
                competition_id=comp_id,
                voie_id=voie_id
            )
            db.session.add(comp_voie)
        
        try:
            db.session.commit()
            return jsonify({'success': True})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': str(e)}), 500

# Routes pour les catégories
@api_bp.route('/admin/categories')
@require_admin
def get_categories():
    categories = Categorie.query.all()
    
    return jsonify([{
        'id': cat.id,
        'nom': cat.nom,
        'annee_min': cat.annee_min,
        'annee_max': cat.annee_max,
        'genre': cat.genre
    } for cat in categories])

@api_bp.route('/categorie/create', methods=['POST'])
@require_admin
def create_categorie():
    data = request.get_json()
    
    nom = data.get('nom')
    annee_min = data.get('annee_min')
    annee_max = data.get('annee_max')
    genre = data.get('genre')  # masculin, feminin, mixte
    
    if not all([nom, annee_min, annee_max, genre]):
        return jsonify({'success': False, 'message': 'Toutes les données sont requises'}), 400
    
    if annee_min > annee_max:
        return jsonify({'success': False, 'message': 'Année min doit être <= année max'}), 400
    
    categorie = Categorie(
        nom=nom,
        annee_min=annee_min,
        annee_max=annee_max,
        genre=genre
    )
    
    try:
        db.session.add(categorie)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Routes pour les niveaux
@api_bp.route('/level/create', methods=['POST'])
@require_admin
def create_level():
    data = request.get_json()
    
    nom = data.get('nom')
    score = data.get('score')
    
    if not nom or score is None:
        return jsonify({'success': False, 'message': 'Nom et score requis'}), 400
    
    level = Level(nom=nom, score=int(score))
    
    try:
        db.session.add(level)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Routes pour les utilisateurs
@api_bp.route('/admin/users')
@require_admin_or_ouvreur
def get_users():
    users = User.query.all()
    
    result = []
    for user in users:
        nb_validations = ValidationGrimpeur.query.filter_by(grimpeur_id=user.id).count()
        nb_inscriptions = InscriptionCompetition.query.filter_by(grimpeur_id=user.id).count()
        
        result.append({
            'id': user.id,
            'nom': user.nom,
            'prenom': user.prenom,
            'date_naissance': user.date_naissance.strftime('%d/%m/%Y'),
            'email': user.email,
            'telephone': user.telephone,
            'sexe': user.sexe,
            'role': user.role,
            'code_connexion': user.code_connexion,
            'nb_validations': nb_validations,
            'nb_inscriptions': nb_inscriptions
        })
    
    return jsonify(result)

@api_bp.route('/user/create', methods=['POST'])
@require_admin_or_ouvreur
def create_user():
    data = request.get_json()
    
    nom = data.get('nom')
    prenom = data.get('prenom')
    date_naissance = datetime.strptime(data.get('date_naissance'), '%Y-%m-%d').date()
    email = data.get('email')
    telephone = data.get('telephone')
    sexe = data.get('sexe')
    role = data.get('role', 'grimpeur')
    
    if not all([nom, prenom, date_naissance, sexe]):
        return jsonify({'success': False, 'message': 'Données manquantes'}), 400
    
    # Vérifier si l'utilisateur existe déjà
    existing = User.query.filter_by(nom=nom, prenom=prenom, date_naissance=date_naissance).first()
    if existing:
        # Mettre à jour les données
        if email:
            existing.email = email
        if telephone:
            existing.telephone = telephone
        existing.sexe = sexe
        user = existing
    else:
        # Créer un nouvel utilisateur
        user = User(
            nom=nom,
            prenom=prenom,
            date_naissance=date_naissance,
            email=email,
            telephone=telephone,
            sexe=sexe,
            role=role
        )
        user.generate_code_connexion()
        db.session.add(user)
    
    try:
        db.session.commit()
        return jsonify({
            'success': True, 
            'user_id': user.id, 
            'code_connexion': user.code_connexion
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Routes pour l'inscription aux compétitions
@api_bp.route('/competition/<int:comp_id>/inscription', methods=['POST'])
def inscription_competition(comp_id):
    competition = Competition.query.get_or_404(comp_id)
    
    if not competition.inscription_is_open:
        return jsonify({'success': False, 'message': 'Les inscriptions sont fermées'}), 403
    
    # Vérifier le nombre maximum de participants
    nb_inscrits = InscriptionCompetition.query.filter_by(competition_id=comp_id).count()
    if nb_inscrits >= competition.nombre_participant_max:
        return jsonify({'success': False, 'message': 'Compétition complète'}), 403
    
    data = request.get_json()
    
    # Créer ou récupérer l'utilisateur
    user_data = {
        'nom': data.get('nom'),
        'prenom': data.get('prenom'),
        'date_naissance': data.get('date_naissance'),
        'email': data.get('email'),
        'telephone': data.get('telephone'),
        'sexe': data.get('sexe'),
        'role': 'grimpeur'
    }
    
    # Appeler la fonction de création d'utilisateur
    user_response = create_user_internal(user_data)
    if not user_response['success']:
        return jsonify(user_response), 400
    
    user_id = user_response['user_id']
    user = User.query.get(user_id)
    
    # Vérifier que l'utilisateur correspond à une catégorie de la compétition
    categories = db.session.query(Categorie).join(CompetitionCategorie)\
        .filter(CompetitionCategorie.competition_id == comp_id).all()
    
    user_matches_category = False
    for categorie in categories:
        if check_user_category(user, categorie):
            user_matches_category = True
            break
    
    if not user_matches_category:
        return jsonify({'success': False, 'message': 'Aucune catégorie ne correspond à ce profil'}), 403
    
    # Vérifier si déjà inscrit
    existing = InscriptionCompetition.query.filter_by(
        grimpeur_id=user_id,
        competition_id=comp_id
    ).first()
    
    if existing:
        return jsonify({'success': False, 'message': 'Déjà inscrit à cette compétition'}), 403
    
    # Créer l'inscription
    inscription = InscriptionCompetition(
        grimpeur_id=user_id,
        competition_id=comp_id
    )
    
    try:
        db.session.add(inscription)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Inscription réussie',
            'code_connexion': user.code_connexion
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

def create_user_internal(data):
    """Fonction interne pour créer un utilisateur"""
    nom = data.get('nom')
    prenom = data.get('prenom')
    date_naissance = datetime.strptime(data.get('date_naissance'), '%Y-%m-%d').date()
    email = data.get('email')
    telephone = data.get('telephone')
    sexe = data.get('sexe')
    role = data.get('role', 'grimpeur')
    
    if not all([nom, prenom, date_naissance, sexe]):
        return {'success': False, 'message': 'Données manquantes'}
    
    # Vérifier si l'utilisateur existe déjà
    existing = User.query.filter_by(nom=nom, prenom=prenom, date_naissance=date_naissance).first()
    if existing:
        # Mettre à jour les données
        if email:
            existing.email = email
        if telephone:
            existing.telephone = telephone
        existing.sexe = sexe
        user = existing
    else:
        # Créer un nouvel utilisateur
        user = User(
            nom=nom,
            prenom=prenom,
            date_naissance=date_naissance,
            email=email,
            telephone=telephone,
            sexe=sexe,
            role=role
        )
        user.generate_code_connexion()
        db.session.add(user)
    
    return {'success': True, 'user_id': user.id, 'code_connexion': user.code_connexion}

def check_user_category(user, categorie):
    """Vérifier si un utilisateur correspond à une catégorie"""
    annee_naissance = user.date_naissance.year
    age = datetime.now().year - annee_naissance
    
    # Vérifier l'âge
    if age < categorie.annee_min or age > categorie.annee_max:
        return False
    
    # Vérifier le genre
    if categorie.genre == 'mixte':
        return True
    elif categorie.genre == user.sexe:
        return True
    
    return False

# Routes pour le classement
@api_bp.route('/competition/<int:comp_id>/classement')
@require_login
def get_classement(comp_id):
    competition = Competition.query.get_or_404(comp_id)
    
    # Vérifier que la compétition est terminée ou que l'utilisateur a les droits
    user_role = session.get('user_role')
    if competition.date_fin > datetime.now() and user_role not in ['admin', 'ouvreur']:
        return jsonify({'error': 'Classement non disponible'}), 403
    
    # Récupérer les catégories de la compétition
    categories = db.session.query(Categorie).join(CompetitionCategorie)\
        .filter(CompetitionCategorie.competition_id == comp_id).all()
    
    classements = {}
    
    for categorie in categories:
        # Récupérer tous les grimpeurs de cette catégorie inscrits à la compétition
        grimpeurs = db.session.query(User).join(InscriptionCompetition)\
            .filter(InscriptionCompetition.competition_id == comp_id)\
            .all()
        
        # Filtrer par catégorie
        grimpeurs_categorie = [g for g in grimpeurs if check_user_category(g, categorie)]
        
        # Calculer les scores
        scores = []
        for grimpeur in grimpeurs_categorie:
            validations = ValidationGrimpeur.query.filter_by(
                grimpeur_id=grimpeur.id,
                competition_id=comp_id
            ).all()
            
            score_total = 0
            voies_validees = []
            
            for validation in validations:
                if validation.voie and validation.voie.level and validation.circle:
                    score_voie = validation.voie.level.score / validation.circle.ordre
                    score_total += score_voie
                    voies_validees.append({
                        'nom': validation.voie.nom,
                        'score': score_voie,
                        'ordre_circle': validation.circle.ordre
                    })
            
            scores.append({
                'grimpeur': f"{grimpeur.prenom} {grimpeur.nom}",
                'score_total': score_total,
                'nb_voies': len(voies_validees),
                'voies': voies_validees
            })
        
        # Trier par score décroissant
        scores.sort(key=lambda x: x['score_total'], reverse=True)
        
        # Ajouter les positions
        for i, score in enumerate(scores):
            score['position'] = i + 1
        
        classements[categorie.nom] = scores
    
    return jsonify(classements)

# Route pour la validation par un ouvreur/admin
@api_bp.route('/admin/validate', methods=['POST'])
@require_admin_or_ouvreur
def admin_validate():
    data = request.get_json()
    
    grimpeur_id = data.get('grimpeur_id')
    circle_id = data.get('circle_id')
    voie_id = data.get('voie_id')
    competition_id = data.get('competition_id')
    
    if not all([grimpeur_id, circle_id, voie_id, competition_id]):
        return jsonify({'success': False, 'message': 'Données manquantes'}), 400
    
    # Vérifier si une validation existe déjà
    existing = ValidationGrimpeur.query.filter_by(
        grimpeur_id=grimpeur_id,
        voie_id=voie_id,
        competition_id=competition_id
    ).first()
    
    if existing:
        existing.circle_id = circle_id
        existing.datetime_creation = datetime.utcnow()
    else:
        validation = ValidationGrimpeur(
            grimpeur_id=grimpeur_id,
            voie_id=voie_id,
            competition_id=competition_id,
            circle_id=circle_id
        )
        db.session.add(validation)
    
    try:
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Route pour connexion multiple (parent avec plusieurs enfants)
@api_bp.route('/login/multiple', methods=['POST'])
def login_multiple():
    data = request.get_json()
    codes = data.get('codes', [])  # Liste de codes
    
    users = []
    for code in codes:
        user = User.query.filter_by(code_connexion=code).first()
        if user:
            users.append({
                'id': user.id,
                'nom': user.nom,
                'prenom': user.prenom,
                'code': user.code_connexion
            })
    
    if users:
        # Stocker tous les utilisateurs en session
        session['users'] = users
        session['user_role'] = 'grimpeur'
        return jsonify({'success': True, 'users': users})
    
    return jsonify({'success': False, 'message': 'Aucun code valide'}), 400

# Enregistrer les blueprints dans l'application principale
def register_routes(app):
    app.register_blueprint(api_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(grimpeur_bp)
