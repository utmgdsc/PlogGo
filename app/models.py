from flask_pymongo import PyMongo

# set up flask-pymongo ext
mongo = PyMongo()

class User:
    def __init__(self, username, password):
        self.username = username
        self.password = password

    # save registered user info to database
    def save_to_db(self):
        mongo.db.users.insert_one({
            'username': self.username,
            'password': self.password,
        })

    # find user in database by username
    def find_by_username(username):
        return mongo.db.users.find_one({'username': username})