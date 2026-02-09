-- Add zone-related columns to user_locations and vessels
-- Safe to run multiple times due to IF NOT EXISTS

-- Add zone to user_locations to record computed zone at the time of location capture
ALTER TABLE IF NOT EXISTS public.user_locations
  ADD COLUMN IF NOT EXISTS zone text;

-- Add current_zone to vessels to reflect the vessel's latest zone
ALTER TABLE IF NOT EXISTS public.vessels
  ADD COLUMN IF NOT EXISTS current_zone text;

-- Optional indexes for quicker lookups
CREATE INDEX IF NOT EXISTS user_locations_zone_idx ON public.user_locations (zone);
CREATE INDEX IF NOT EXISTS vessels_current_zone_idx ON public.vessels (current_zone);