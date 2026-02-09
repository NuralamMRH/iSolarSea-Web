-- Make vessel_id nullable in fishing_trips table
ALTER TABLE public.fishing_trips ALTER COLUMN vessel_id DROP NOT NULL;

-- Update the foreign key constraint to allow null values
ALTER TABLE public.fishing_trips DROP CONSTRAINT IF EXISTS fishing_trips_vessel_id_fkey;
ALTER TABLE public.fishing_trips ADD CONSTRAINT fishing_trips_vessel_id_fkey 
    FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE SET NULL;
