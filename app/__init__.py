from flask import Flask
from flask_jwt_extended import JWTManager
from flask_pymongo import PyMongo
from .auth import auth_bp
import os

# setup the flask-jwt-extended extension
jwt = JWTManager()

# setup flask-pymongo extension
mongo = PyMongo()

def create_app():
    app = Flask(__name__)

    # load the configuration from env variables 
    app.config['SECRET KEY'] = os.getenv('SECRET KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    app.config['MONGO_URI'] = os.getenv('MONGO_URI')

    # initialize the extensions
    jwt.init_app(app)
    mongo.init_app(app)

    # register the blueprints
    app.register_blueprint(auth_bp)

    return app

