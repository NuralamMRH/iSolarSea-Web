-- Add classified vessel fields to fishing_trips table
-- This migration adds the new fields for vessel classification

ALTER TABLE public.fishing_trips 
ADD COLUMN IF NOT EXISTS fishing_logbook text DEFAULT '',
ADD COLUMN IF NOT EXISTS trading_logbook text DEFAULT '',
ADD COLUMN IF NOT EXISTS transshipment_logbook text DEFAULT '';

-- Add comments for the new fields
COMMENT ON COLUMN public.fishing_trips.fishing_logbook IS 'Fishing Logbook classification (Yes/No)';
COMMENT ON COLUMN public.fishing_trips.trading_logbook IS 'Trading Logbook classification (Yes/No)';
COMMENT ON COLUMN public.fishing_trips.transshipment_logbook IS 'Transshipment Logbook classification (Yes/No)'; 