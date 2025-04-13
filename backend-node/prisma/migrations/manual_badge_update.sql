-- Add new columns to the badges table
ALTER TABLE badges
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT 'https://placehold.co/200x200/4CAF50/FFFFFF?text=Badge';

-- Create or replace the badge check function
CREATE OR REPLACE FUNCTION check_badge_requirements()
RETURNS TRIGGER AS $$
DECLARE
  badge RECORD;
BEGIN
  -- Loop through all badges to check if the user meets requirements
  FOR badge IN SELECT * FROM badges 
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges 
      WHERE user_id = NEW.id AND badge_id = badge.id
    ) THEN
      -- Check if user meets the requirements for this badge
      -- All specified requirements must be met (AND logic)
      IF (
        -- Steps requirement (if specified)
        (badge.steps_required IS NULL OR NEW.total_steps >= badge.steps_required) AND
        -- Distance requirement (if specified)
        (badge.distances_required IS NULL OR NEW.total_distance >= badge.distances_required)
      ) THEN
        -- Award the badge to the user
        INSERT INTO user_badges (id, user_id, badge_id, created_at)
        VALUES (gen_random_uuid(), NEW.id, badge.id, NOW());
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists, then create it
DROP TRIGGER IF EXISTS user_badge_check ON users;

CREATE TRIGGER user_badge_check
AFTER INSERT OR UPDATE OF total_steps, total_distance ON users
FOR EACH ROW
EXECUTE FUNCTION check_badge_requirements(); 