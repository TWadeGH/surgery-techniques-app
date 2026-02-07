-- Update rep_inquiries table to support new contact form fields
-- Add country, city, state, and phone fields

-- Add country column (defaults to 'United States')
ALTER TABLE rep_inquiries 
ADD COLUMN IF NOT EXISTS user_country VARCHAR(100) DEFAULT 'United States';

-- Add city column (for US addresses)
ALTER TABLE rep_inquiries 
ADD COLUMN IF NOT EXISTS user_city VARCHAR(100);

-- Add state column (for US addresses)
ALTER TABLE rep_inquiries 
ADD COLUMN IF NOT EXISTS user_state VARCHAR(100);

-- Add phone column (optional)
ALTER TABLE rep_inquiries 
ADD COLUMN IF NOT EXISTS user_phone VARCHAR(50);

-- Remove the old user_location column as we're replacing it with city/state
-- (Run this only if you want to clean up the old field)
-- ALTER TABLE rep_inquiries DROP COLUMN IF EXISTS user_location;

COMMENT ON COLUMN rep_inquiries.user_country IS 'User country, defaults to United States';
COMMENT ON COLUMN rep_inquiries.user_city IS 'User city (primarily for US addresses)';
COMMENT ON COLUMN rep_inquiries.user_state IS 'User state (for US addresses)';
COMMENT ON COLUMN rep_inquiries.user_phone IS 'User phone number (optional)';
