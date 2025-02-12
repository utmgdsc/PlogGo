from app_legacy import create_app 

# create an instance of the Flask app
app = create_app()

# run the app in debug mode for development purposes
if __name__ == '__main__':
    app.run(debug=True)

    