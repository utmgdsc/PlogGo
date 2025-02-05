import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    MONGO_URI = 'mongodb://localhost:27017/test_ploggo'

class TestConfig:
    SECRET_KEY = 'test_secret_key'
    JWT_SECRET_KEY = 'test_jwt_secret_key'
    MONGO_URI = 'mongodb://localhost:27017/test_ploggo'
   