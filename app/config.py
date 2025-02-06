import os


class Config:
    """
    Base configuration class.
    """
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    MONGO_URI = os.getenv('MONGODB_DATABASE_URI')

class TestConfig:
    """
    Configuration settings for the testing environment.
    """
    SECRET_KEY = 'test_secret_key'
    JWT_SECRET_KEY = 'test_jwt_secret_key'
    MONGO_URI = 'mongodb://localhost:27017/test_ploggo'
   