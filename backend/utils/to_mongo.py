def insert_data_to_mongo(db, json_data, collection):
    return db[collection].insert_many(json_data).inserted_ids
  
def delete_all(db, collection):
    db[collection].delete_many({})

def update(db, json_data, collection):
    for item in json_data:
        filter_query = {"_id": item["_id"]}
        update_query = {"$set": item}
        db[collection].update_one(filter_query, update_query, upsert=True)