import schedule
import time
import os
import certifi
from pymongo import MongoClient
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# initialize MongoDB connection
uri = os.getenv("MONGO_URI")
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client["PlogGo"]
expired_tokens = db['token_blacklist']

def remove_expired_tokens():
    now = datetime.now(timezone.utc)
    result = expired_tokens.delete_many({"exp": {"$lt": now}})
    print(f"Expired tokens remove: {result.delete_count}")

# schedule cleanup every hour
schedule.every(1).hours.do(remove_expired_tokens)

if __name__=="__main__":
    print("Token cleanup service started...")
    while True:
        schedule.run_pending()
        time.sleep(60) # check every minute
