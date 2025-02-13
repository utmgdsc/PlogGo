from flask import Flask
from flask_jwt_extended import JWTManager
from flask_pymongo import PyMongo
from .auth_legacy import auth_bp

# setup the flask-jwt-extended extension
jwt = JWTManager()

# setup flask-pymongo extension
mongo = PyMongo()

def create_app(testing=False):
    app = Flask(__name__)

    # load the configuration from env variables 
    # app.config['SECRET KEY'] = os.getenv('SECRET KEY')
    # app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    # app.config['MONGO_URI'] = os.getenv('MONGO_URI')

    # load test config
    if testing:
        app.config.from_object('app.config.TestConfig')
    else:
        app.config.from_object('app.config.Config')

    jwt.init_app(app) # initialize jwt extension
    mongo.init_app(app) # intialize mongodb connection

    # register the blueprints
    app.register_blueprint(auth_bp)

    return app

