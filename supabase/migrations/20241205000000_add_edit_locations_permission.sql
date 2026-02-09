-- Add missing edit_locations permission to vessel_access_permission enum
-- This migration adds the missing permission that was referenced in RLS policies

-- Add the missing permission to the existing enum
DO $$
BEGIN
  -- Try to add the missing permission to the existing enum
  ALTER TYPE vessel_access_permission ADD VALUE 'edit_locations';
EXCEPTION
  WHEN duplicate_object THEN
    -- If the value already exists, do nothing
    NULL;
  WHEN undefined_object THEN
    -- If the enum doesn't exist yet, create it with all values
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
END
$$; 