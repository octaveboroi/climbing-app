# app.py - Application Flask principale mise à jour
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from config import Config
from models import db, User, Competition, Voie, Circle, Level, Categorie
from routes import register_routes
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialiser la base de données
    db.init_app(app)
    
    # Enregistrer les routes
    register_routes(app)
    
    # Routes principales
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/login')
    def login():
        return render_template('login.html')
    
    @app.route('/inscription/<int:competition_id>')
    def inscription_publique(competition_id):
        competition = Competition.query.get_or_404(competition_id)
        if not competition.inscription_is_open:
            flash('Les inscriptions sont fermées pour cette compétition.', 'error')
            return redirect(url_for('index'))
        
        categories = db.session.query(Categorie).join(CompetitionCategorie)\
            .filter(CompetitionCategorie.competition_id == competition_id).all()
        
        return render_template('public/inscription.html', 
                             competition=competition, 
                             categories=categories)
    
    @app.route('/classement/<int:competition_id>')
    def classement_public(competition_id):
        competition = Competition.query.get_or_404(competition_id)
        return render_template('public/classement-display.html', competition=competition)
    
    # Pages pour grimpeurs
    @app.route('/grimpeur/dashboard')
    def grimpeur_dashboard():
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return render_template('grimpeur/dashboard.html')
    
    @app.route('/grimpeur/voies')
    def grimpeur_voies():
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return render_template('grimpeur/voies.html')
    
    @app.route('/grimpeur/voie/<int:voie_id>')
    def grimpeur_voie_detail(voie_id):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        voie = Voie.query.get_or_404(voie_id)
        return render_template('grimpeur/voie-detail.html', voie=voie)
    
    # Pages admin
    @app.route('/admin/dashboard')
    def admin_dashboard():
        if session.get('user_role') not in ['admin', 'ouvreur']:
            return redirect(url_for('login'))
        return render_template('admin/dashboard.html')
    
    @app.route('/admin/competitions')
    def admin_competitions():
        if session.get('user_role') not in ['admin', 'ouvreur']:
            return redirect(url_for('login'))
        return render_template('admin/competitions.html')
    
    @app.route('/admin/voies')
    def admin_voies():
        if session.get('user_role') not in ['admin', 'ouvreur']:
            return redirect(url_for('login'))
        return render_template('admin/voies.html')
    
    @app.route('/admin/users')
    def admin_users():
        if session.get('user_role') not in ['admin', 'ouvreur']:
            return redirect(url_for('login'))
        return render_template('admin/users.html')
    
    # Créer les tables et données initiales
    @app.before_first_request
    def create_tables():
        db.create_all()
        
        # Créer un admin par défaut si aucun n'existe
        if not User.query.filter_by(role='admin').first():
            admin = User(
                nom='Admin',
                prenom='System',
                date_naissance=date(1990, 1, 1),
                telephone='0123456789',
                email='admin@escalade.com',
                sexe='masculin',
                role='admin'
            )
            admin.generate_code_connexion()
            db.session.add(admin)
            
            # Créer des niveaux par défaut
            niveaux = [
                ('3a', 100), ('3b', 120), ('3c', 140),
                ('4a', 160), ('4b', 180), ('4c', 200),
                ('5a', 250), ('5b', 300), ('5c', 350),
                ('6a', 400), ('6b', 450), ('6c', 500),
                ('7a', 600), ('7b', 700), ('7c', 800)
            ]
            
            for nom, score in niveaux:
                level = Level(nom=nom, score=score)
                db.session.add(level)
            
            # Créer des catégories par défaut
            categories = [
                ('Microbe M', 6, 8, 'masculin'),
                ('Microbe F', 6, 8, 'feminin'),
                ('Poussin M', 9, 10, 'masculin'),
                ('Poussin F', 9, 10, 'feminin'),
                ('Benjamin M', 11, 12, 'masculin'),
                ('Benjamin F', 11, 12, 'feminin'),
                ('Minime M', 13, 14, 'masculin'),
                ('Minime F', 13, 14, 'feminin'),
                ('Cadet M', 15, 16, 'masculin'),
                ('Cadet F', 15, 16, 'feminin'),
                ('Junior M', 17, 19, 'masculin'),
                ('Junior F', 17, 19, 'feminin'),
                ('Senior M', 20, 39, 'masculin'),
                ('Senior F', 20, 39, 'feminin'),
                ('Vétéran M', 40, 99, 'masculin'),
                ('Vétéran F', 40, 99, 'feminin'),
                ('Mixte', 6, 99, 'mixte')
            ]
            
            for nom, annee_min, annee_max, genre in categories:
                cat = Categorie(nom=nom, annee_min=annee_min, annee_max=annee_max, genre=genre)
                db.session.add(cat)
            
            db.session.commit()
            print(f"Admin créé avec le code: {admin.code_connexion}")
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
