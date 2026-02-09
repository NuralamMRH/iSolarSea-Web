-- Create fuel_consumption table
CREATE TABLE IF NOT EXISTS public.fuel_consumption (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vessel_id uuid NOT NULL,
    trip_id uuid,
    start_mileage numeric(10,2) NOT NULL,
    end_mileage numeric(10,2) NOT NULL,
    refueling_volume numeric(10,2) NOT NULL,
    fuel_consumption numeric(10,2) NOT NULL,
    refueling_date date NOT NULL,
    remarks text DEFAULT '',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT fuel_consumption_pkey PRIMARY KEY (id),
    CONSTRAINT fuel_consumption_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE,
    CONSTRAINT fuel_consumption_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.fishing_trips(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fuel_consumption_vessel_id ON public.fuel_consumption(vessel_id);
CREATE INDEX IF NOT EXISTS idx_fuel_consumption_trip_id ON public.fuel_consumption(trip_id);
CREATE INDEX IF NOT EXISTS idx_fuel_consumption_refueling_date ON public.fuel_consumption(refueling_date);

-- Enable RLS
ALTER TABLE public.fuel_consumption ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own vessel fuel consumption" ON public.fuel_consumption
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own vessel fuel consumption" ON public.fuel_consumption
    FOR INSERT WITH CHECK (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own vessel fuel consumption" ON public.fuel_consumption
    FOR UPDATE USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own vessel fuel consumption" ON public.fuel_consumption
    FOR DELETE USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    ); 