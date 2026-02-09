-- Add email tracking columns to vessel_access_invitations table
-- This migration adds columns to track email sending status
 
ALTER TABLE public.vessel_access_invitations 
ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone; 