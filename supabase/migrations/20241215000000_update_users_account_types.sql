-- Update users table to support account types and packages
-- This migration adds new columns for account type and package selection

-- First, let's add the new columns to the users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS account_type text CHECK (account_type IN ('Ship Owner', 'Fleet Management', 'NM Processing')),
ADD COLUMN IF NOT EXISTS account_package text CHECK (account_package IN ('Gold', 'Premium', 'Basic'));

-- Update the role column to be more flexible for the new system
-- We'll keep the existing role column for backward compatibility
-- but the new account_type and account_package will be the primary way to categorize users

-- Add comments to explain the new columns
COMMENT ON COLUMN public.users.account_type IS 'Account type: Ship Owner, Fleet Management, or NM Processing';
COMMENT ON COLUMN public.users.account_package IS 'Account package: Gold, Premium, or Basic';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_account_type ON public.users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_account_package ON public.users(account_package); 