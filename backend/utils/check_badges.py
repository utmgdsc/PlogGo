def award_badges(user_id, total_steps):
    # Find badges the user hasn't earned yet
    new_badges = badges.find({"steps_required": {"$lte": total_steps}})
    
    for badge in new_badges:
        # Add badge if not already earned
        users.update_one(
            {"_id": user_id, "badges": {"$ne": badge["_id"]}},  # Ensure no duplicate badges
            {"$addToSet": {"badges": badge["_id"]}}
        )