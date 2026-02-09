-- Create user_locations table for tracking user locations
CREATE TABLE IF NOT EXISTS public.user_locations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    accuracy numeric,
    heading numeric,
    speed numeric,
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_locations_pkey PRIMARY KEY (id),
    CONSTRAINT user_locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Add RLS policies for user_locations table
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own location
CREATE POLICY "Users can insert their own location" 
    ON public.user_locations 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to select their own location
CREATE POLICY "Users can view their own location" 
    ON public.user_locations 
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Policy to allow admins to view all locations
CREATE POLICY "Admins can view all locations" 
    ON public.user_locations 
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create index on user_id and timestamp for faster queries
CREATE INDEX IF NOT EXISTS user_locations_user_id_timestamp_idx 
    ON public.user_locations (user_id, timestamp);

-- Add comment to table
COMMENT ON TABLE public.user_locations IS 'Stores user location data for tracking purposes';