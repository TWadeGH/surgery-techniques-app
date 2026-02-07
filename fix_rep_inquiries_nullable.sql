-- Make user_location nullable since we're now using separate columns
ALTER TABLE rep_inquiries 
ALTER COLUMN user_location DROP NOT NULL;

-- Or alternatively, set a default if it has NOT NULL constraint
ALTER TABLE rep_inquiries 
ALTER COLUMN user_location SET DEFAULT NULL;
