-- Fix Production Database - Run this on your Replit production database
-- This file fixes the annual_revenue migration issue

-- Fix annual_revenue column type
ALTER TABLE accounts 
ALTER COLUMN annual_revenue TYPE numeric(20, 2) 
USING CASE 
  WHEN annual_revenue IS NULL THEN NULL
  ELSE annual_revenue::numeric(20, 2)
END;

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name = 'annual_revenue';
