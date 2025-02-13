from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

# create blueprint object
auth_bp = Blueprint('auth', __name__)

# registration route
@auth_bp.route('/register', methods=['GET','POST'])
def register():
    from app_legacy import mongo
    # data= request.get_json()
    # email = data.get('email')
    # password = data.get('password')
    if request.method == 'POST':
        # retrieve email and password submission
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # check if the username already exists
        if mongo.db.users.find_one({'email': email}):
            return jsonify(message="Username already exists"), 400
        else:
            # hash the password
            hashed_password = generate_password_hash(password)

            # # create and save the user
            # user = User(username=email, password=hashed_password)
            # user.save_to_db()
            mongo.db.users.insert_one({'email': email, 'password': hashed_password})
            return jsonify(message="User registered successfully"), 201

# login route
@auth_bp.route('/login', methods=['GET','POST'])
def login():
    from app_legacy import mongo
    # data = request.get_json()
    # email = data.get('email')
    # password = data.get('password')

    # # find the user by username
    # user = User.find_by_email(email)
    # if not user or not check_password_hash(user['password'], password):
    #     return jsonify(message="Invalid username or password"), 401
    
    # # create a JWT token
    # access_token = create_access_token(identity=email)
    # return jsonify(access_token=access_token), 200
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        # check if the username and password match
        user_profile = mongo.db.users.find_one({'email': email})

        # retrieve password from database
        hashed_password = user_profile.get('password', '')
        
        if not user_profile or not check_password_hash(hashed_password, password):
            return jsonify(message="Invalid email or password"), 401
        else:
            # create JWT token
            access_token = create_access_token(identity=email)
            return jsonify(access_token=access_token), 200
                                 
# protected route
# @auth_bp.route('/protected', methods=['POST'])
# @jwt_required()
# def register_litter():
#     return None

