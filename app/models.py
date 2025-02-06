# from flask_pymongo import PyMongo

# # set up flask-pymongo ext
# mongo = PyMongo()

# class User:
#     def __init__(self, email, password):
#         self.email = email
#         self.password = password

#     # save registered user info to database
#     def save_to_db(self):
#         mongo.db.users.insert_one({
#             'username': self.email,
#             'password': self.password,
#         })

#     @staticmethod
#     def find_by_email(email):
#         return mongo.db.users.find_one({'email': email})