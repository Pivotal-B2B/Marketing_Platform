-- Migration: Fix annual_revenue column type
-- This migration safely converts annual_revenue to numeric(20,2)
-- Safe to run multiple times (idempotent)

-- Step 1: Check if column needs conversion
DO $$ 
BEGIN
  -- Only run if the column is not already numeric(20,2)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' 
    AND column_name = 'annual_revenue'
    AND (data_type != 'numeric' OR numeric_precision != 20 OR numeric_scale != 2)
  ) THEN
    -- Step 2: Convert using USING clause to handle any existing data
    ALTER TABLE accounts 
    ALTER COLUMN annual_revenue TYPE numeric(20, 2) 
    USING CASE 
      WHEN annual_revenue IS NULL THEN NULL
      ELSE annual_revenue::numeric(20, 2)
    END;
    
    RAISE NOTICE 'annual_revenue column converted to numeric(20,2)';
  ELSE
    RAISE NOTICE 'annual_revenue column already correct type';
  END IF;
END $$;
