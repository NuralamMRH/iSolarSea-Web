-- Create vessel access control system
-- This migration creates tables and policies for vessel delegation and access control

-- Create vessel_access_permissions enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vessel_access_permission') THEN
    CREATE TYPE vessel_access_permission AS ENUM (
      'view_basic_info',
      'view_detailed_info', 
      'view_catch_records',
      'view_trips',
      'view_crew',
      'view_locations',
      'edit_basic_info',
      'edit_detailed_info',
      'edit_catch_records', 
      'edit_trips',
      'edit_crew',
      'edit_locations',
      'manage_access',
      'delete_vessel',
      'full_access'
    );
  END IF;
END
$$;

-- Create vessel_access_roles enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vessel_access_role') THEN
    CREATE TYPE vessel_access_role AS ENUM (
      'owner',
      'moderator', 
      'captain',
      'crew_member',
      'viewer',
      'editor',
      'delegate'
    );
  END IF;
END
$$;

-- Create vessel_access_control table
CREATE TABLE IF NOT EXISTS public.vessel_access_control (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vessel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    granted_by uuid NOT NULL,
    role vessel_access_role NOT NULL DEFAULT 'delegate',
    permissions vessel_access_permission[] NOT NULL DEFAULT ARRAY['view_basic_info'::vessel_access_permission],
    is_active boolean NOT NULL DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vessel_access_control_pkey PRIMARY KEY (id),
    CONSTRAINT vessel_access_control_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE,
    CONSTRAINT vessel_access_control_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT vessel_access_control_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT vessel_access_control_unique_user_vessel UNIQUE (vessel_id, user_id)
);

-- Create vessel_access_invitations table for pending invitations
CREATE TABLE IF NOT EXISTS public.vessel_access_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vessel_id uuid NOT NULL,
    email text NOT NULL,
    role vessel_access_role NOT NULL DEFAULT 'delegate',
    permissions vessel_access_permission[] NOT NULL DEFAULT ARRAY['view_basic_info'::vessel_access_permission],
    invited_by uuid NOT NULL,
    invitation_code text NOT NULL UNIQUE,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    is_accepted boolean NOT NULL DEFAULT false,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vessel_access_invitations_pkey PRIMARY KEY (id),
    CONSTRAINT vessel_access_invitations_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE,
    CONSTRAINT vessel_access_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vessel_access_control_vessel_id ON public.vessel_access_control(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_access_control_user_id ON public.vessel_access_control(user_id);
CREATE INDEX IF NOT EXISTS idx_vessel_access_control_granted_by ON public.vessel_access_control(granted_by);
CREATE INDEX IF NOT EXISTS idx_vessel_access_invitations_vessel_id ON public.vessel_access_invitations(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_access_invitations_email ON public.vessel_access_invitations(email);
CREATE INDEX IF NOT EXISTS idx_vessel_access_invitations_code ON public.vessel_access_invitations(invitation_code);

-- Enable Row Level Security
ALTER TABLE public.vessel_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_access_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vessel_access_control
CREATE POLICY "Users can view their own access controls" ON public.vessel_access_control
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Vessel owners can view all access controls for their vessels" ON public.vessel_access_control
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Vessel moderators can view access controls for their vessels" ON public.vessel_access_control
    FOR SELECT USING (
        vessel_id IN (
            SELECT vac.vessel_id FROM public.vessel_access_control vac
            WHERE vac.user_id = auth.uid() AND vac.role = 'moderator'
        )
    );

CREATE POLICY "Vessel owners can manage access controls" ON public.vessel_access_control
    FOR ALL USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Vessel moderators can manage access controls" ON public.vessel_access_control
    FOR ALL USING (
        vessel_id IN (
            SELECT vac.vessel_id FROM public.vessel_access_control vac
            WHERE vac.user_id = auth.uid() AND vac.role = 'moderator'
        )
    );

-- Create RLS policies for vessel_access_invitations
CREATE POLICY "Users can view their own invitations" ON public.vessel_access_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Vessel owners can view all invitations for their vessels" ON public.vessel_access_invitations
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Vessel owners can manage invitations" ON public.vessel_access_invitations
    FOR ALL USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

-- Add policy for vessel moderators to manage invitations
CREATE POLICY "Vessel moderators can manage invitations" ON public.vessel_access_invitations
    FOR ALL USING (
        vessel_id IN (
            SELECT vac.vessel_id FROM public.vessel_access_control vac
            WHERE vac.user_id = auth.uid() AND vac.role = 'moderator'
        )
    );

-- Create function to check vessel access permissions
CREATE OR REPLACE FUNCTION check_vessel_access(
    p_vessel_id uuid,
    p_permission vessel_access_permission
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_access boolean := false;
    v_user_permissions vessel_access_permission[];
BEGIN
    -- Check if user is the vessel owner
    IF EXISTS (
        SELECT 1 FROM public.vessels 
        WHERE id = p_vessel_id AND user_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;

    -- Check if user has explicit access control
    SELECT permissions INTO v_user_permissions
    FROM public.vessel_access_control
    WHERE vessel_id = p_vessel_id 
    AND user_id = auth.uid() 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

    -- Check if user has the required permission
    IF v_user_permissions IS NOT NULL AND p_permission = ANY(v_user_permissions) THEN
        RETURN true;
    END IF;

    -- Check if user has full_access permission
    IF v_user_permissions IS NOT NULL AND 'full_access' = ANY(v_user_permissions) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- Create function to get user's vessel access role
CREATE OR REPLACE FUNCTION get_vessel_access_role(p_vessel_id uuid)
RETURNS vessel_access_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role vessel_access_role;
BEGIN
    -- Check if user is the vessel owner
    IF EXISTS (
        SELECT 1 FROM public.vessels 
        WHERE id = p_vessel_id AND user_id = auth.uid()
    ) THEN
        RETURN 'owner';
    END IF;

    -- Get user's access role
    SELECT role INTO v_role
    FROM public.vessel_access_control
    WHERE vessel_id = p_vessel_id 
    AND user_id = auth.uid() 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

    RETURN COALESCE(v_role, 'viewer');
END;
$$;

-- Update existing RLS policies to use the new access control system

-- Update vessels table policies
DROP POLICY IF EXISTS "Users can view their own vessels" ON public.vessels;
DROP POLICY IF EXISTS "Users can insert their own vessels" ON public.vessels;
DROP POLICY IF EXISTS "Users can update their own vessels" ON public.vessels;
DROP POLICY IF EXISTS "Users can delete their own vessels" ON public.vessels;

CREATE POLICY "Users can view vessels they have access to" ON public.vessels
    FOR SELECT USING (
        user_id = auth.uid() OR 
        check_vessel_access(id, 'view_basic_info')
    );

CREATE POLICY "Users can insert their own vessels" ON public.vessels
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update vessels they have edit access to" ON public.vessels
    FOR UPDATE USING (
        user_id = auth.uid() OR 
        check_vessel_access(id, 'edit_basic_info')
    );

CREATE POLICY "Only vessel owners can delete vessels" ON public.vessels
    FOR DELETE USING (user_id = auth.uid());

-- Update fishing_trips table policies
DROP POLICY IF EXISTS "Users can view their vessel trips" ON public.fishing_trips;
DROP POLICY IF EXISTS "Users can insert trips for their vessels" ON public.fishing_trips;
DROP POLICY IF EXISTS "Users can update their vessel trips" ON public.fishing_trips;
DROP POLICY IF EXISTS "Users can delete their vessel trips" ON public.fishing_trips;

CREATE POLICY "Users can view trips for vessels they have access to" ON public.fishing_trips
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        ) OR
        check_vessel_access(vessel_id, 'view_trips')
    );

CREATE POLICY "Users can insert trips for vessels they have edit access to" ON public.fishing_trips
    FOR INSERT WITH CHECK (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        ) OR
        check_vessel_access(vessel_id, 'edit_trips')
    );

CREATE POLICY "Users can update trips for vessels they have edit access to" ON public.fishing_trips
    FOR UPDATE USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        ) OR
        check_vessel_access(vessel_id, 'edit_trips')
    );

CREATE POLICY "Users can delete trips for vessels they own" ON public.fishing_trips
    FOR DELETE USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

-- Update catch_records table policies
DROP POLICY IF EXISTS "Users can view their vessel catch records" ON public.catch_records;
DROP POLICY IF EXISTS "Users can insert catch records for their vessels" ON public.catch_records;

CREATE POLICY "Users can view catch records for vessels they have access to" ON public.catch_records
    FOR SELECT USING (
        haul_id IN (
            SELECT fh.id FROM public.fishing_hauls fh
            JOIN public.fishing_trips ft ON fh.trip_id = ft.id
            JOIN public.vessels v ON ft.vessel_id = v.id
            WHERE v.user_id = auth.uid()
        ) OR
        haul_id IN (
            SELECT fh.id FROM public.fishing_hauls fh
            JOIN public.fishing_trips ft ON fh.trip_id = ft.id
            WHERE check_vessel_access(ft.vessel_id, 'view_catch_records')
        )
    );

CREATE POLICY "Users can insert catch records for vessels they have edit access to" ON public.catch_records
    FOR INSERT WITH CHECK (
        haul_id IN (
            SELECT fh.id FROM public.fishing_hauls fh
            JOIN public.fishing_trips ft ON fh.trip_id = ft.id
            JOIN public.vessels v ON ft.vessel_id = v.id
            WHERE v.user_id = auth.uid()
        ) OR
        haul_id IN (
            SELECT fh.id FROM public.fishing_hauls fh
            JOIN public.fishing_trips ft ON fh.trip_id = ft.id
            WHERE check_vessel_access(ft.vessel_id, 'edit_catch_records')
        )
    );

-- Update crew_members table policies
DROP POLICY IF EXISTS "Users can view their vessel crew" ON public.crew_members;
DROP POLICY IF EXISTS "Users can insert crew for their vessels" ON public.crew_members;

CREATE POLICY "Users can view crew for vessels they have access to" ON public.crew_members
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        ) OR
        check_vessel_access(vessel_id, 'view_crew')
    );

CREATE POLICY "Users can insert crew for vessels they have edit access to" ON public.crew_members
    FOR INSERT WITH CHECK (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        ) OR
        check_vessel_access(vessel_id, 'edit_crew')
    );

-- Update vessel_locations table policies
DROP POLICY IF EXISTS "Users can view their vessel locations" ON public.vessel_locations;
DROP POLICY IF EXISTS "Users can insert locations for their vessels" ON public.vessel_locations;

CREATE POLICY "Users can view locations for vessels they have access to" ON public.vessel_locations
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        ) OR
        check_vessel_access(vessel_id, 'view_locations')
    );

CREATE POLICY "Users can insert locations for vessels they have edit access to" ON public.vessel_locations
    FOR INSERT WITH CHECK (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        ) OR
        check_vessel_access(vessel_id, 'edit_locations')
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vessel_access_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vessel_access_control_updated_at
    BEFORE UPDATE ON public.vessel_access_control
    FOR EACH ROW
    EXECUTE FUNCTION update_vessel_access_control_updated_at(); 