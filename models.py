# models.py - Modèles de base de données complets
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
import hashlib

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    date_naissance = db.Column(db.Date, nullable=False)
    telephone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    sexe = db.Column(db.String(10), nullable=False)  # masculin, feminin
    role = db.Column(db.String(20), nullable=False)  # admin, ouvreur, grimpeur
    code_connexion = db.Column(db.String(6), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    validations = db.relationship('ValidationGrimpeur', backref='grimpeur', lazy='dynamic')
    inscriptions = db.relationship('InscriptionCompetition', backref='grimpeur', lazy='dynamic')
    
    def generate_code_connexion(self):
        """Génère le code de connexion basé sur nom, prénom, année, sexe"""
        data = f"{self.nom.lower()}{self.prenom.lower()}{self.date_naissance.year}{self.sexe}"
        hash_obj = hashlib.md5(data.encode('utf-8'))
        # Convertir en chiffres
        code = ''.join([str(ord(c) % 10) for c in hash_obj.hexdigest()[:6]])
        self.code_connexion = code
        return code
    
    def get_age(self):
        return datetime.now().year - self.date_naissance.year
    
    def to_dict(self):
        return {
            'id': self.id,
            'nom': self.nom,
            'prenom': self.prenom,
            'date_naissance': self.date_naissance.isoformat(),
            'telephone': self.telephone,
            'email': self.email,
            'sexe': self.sexe,
            'role': self.role,
            'code_connexion': self.code_connexion,
            'age': self.get_age()
        }

class Competition(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(200), nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    date_debut = db.Column(db.DateTime, nullable=False)
    date_fin = db.Column(db.DateTime, nullable=False)
    nombre_participant_max = db.Column(db.Integer, default=100)
    is_open = db.Column(db.Boolean, default=False)
    inscription_is_open = db.Column(db.Boolean, default=False)
    
    # Relations
    categories = db.relationship('CompetitionCategorie', backref='competition', lazy='dynamic', cascade='all, delete-orphan')
    voies = db.relationship('CompetitionVoie', backref='competition', lazy='dynamic', cascade='all, delete-orphan')
    inscriptions = db.relationship('InscriptionCompetition', backref='competition', lazy='dynamic', cascade='all, delete-orphan')
    validations = db.relationship('ValidationGrimpeur', backref='competition', lazy='dynamic')
    
    @property
    def is_future(self):
        return self.date_debut > datetime.now()
    
    @property
    def is_current(self):
        now = datetime.now()
        return self.date_debut <= now <= self.date_fin
    
    @property
    def is_past(self):
        return self.date_fin < datetime.now()

class Level(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(50), nullable=False, unique=True)
    score = db.Column(db.Integer, nullable=False)
    
    # Relations
    voies = db.relationship('Voie', backref='level', lazy='dynamic')

class Voie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)
    image_path = db.Column(db.String(200))
    level_id = db.Column(db.Integer, db.ForeignKey('level.id'))
    commentaire = db.Column(db.Text)
    
    # Relations
    circles = db.relationship('Circle', backref='voie', lazy='dynamic', cascade='all, delete-orphan')
    competitions = db.relationship('CompetitionVoie', backref='voie', lazy='dynamic')
    validations = db.relationship('ValidationGrimpeur', backref='voie', lazy='dynamic')

class Circle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    x = db.Column(db.Float, nullable=False)  # Pourcentage
    y = db.Column(db.Float, nullable=False)  # Pourcentage
    radius = db.Column(db.Float, nullable=False)  # Pourcentage
    ordre = db.Column(db.Integer, nullable=False)
    voie_id = db.Column(db.Integer, db.ForeignKey('voie.id'), nullable=False)
    
    # Relations
    validations = db.relationship('ValidationGrimpeur', backref='circle', lazy='dynamic')

class Categorie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    annee_min = db.Column(db.Integer, nullable=False)
    annee_max = db.Column(db.Integer, nullable=False)
    genre = db.Column(db.String(10), nullable=False)  # masculin, feminin, mixte
    
    # Relations
    competitions = db.relationship('CompetitionCategorie', backref='categorie', lazy='dynamic')
    
    def matches_user(self, user):
        """Vérifie si un utilisateur correspond à cette catégorie"""
        age = user.get_age()
        if age < self.annee_min or age > self.annee_max:
            return False
        return self.genre == 'mixte' or self.genre == user.sexe

class ValidationGrimpeur(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    datetime_creation = db.Column(db.DateTime, default=datetime.utcnow)
    grimpeur_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    voie_id = db.Column(db.Integer, db.ForeignKey('voie.id'), nullable=False)
    competition_id = db.Column(db.Integer, db.ForeignKey('competition.id'), nullable=False)
    circle_id = db.Column(db.Integer, db.ForeignKey('circle.id'), nullable=False)
    
    def calculate_score(self):
        """Calcule le score de cette validation"""
        if self.voie and self.voie.level and self.circle:
            return self.voie.level.score / self.circle.ordre
        return 0

# Tables de liaison
class CompetitionCategorie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    competition_id = db.Column(db.Integer, db.ForeignKey('competition.id'), nullable=False)
    categorie_id = db.Column(db.Integer, db.ForeignKey('categorie.id'), nullable=False)
    
    __table_args__ = (db.UniqueConstraint('competition_id', 'categorie_id'),)

class CompetitionVoie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    competition_id = db.Column(db.Integer, db.ForeignKey('competition.id'), nullable=False)
    voie_id = db.Column(db.Integer, db.ForeignKey('voie.id'), nullable=False)
    
    __table_args__ = (db.UniqueConstraint('competition_id', 'voie_id'),)

class InscriptionCompetition(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    competition_id = db.Column(db.Integer, db.ForeignKey('competition.id'), nullable=False)
    grimpeur_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date_inscription = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('competition_id', 'grimpeur_id'),)
