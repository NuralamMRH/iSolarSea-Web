-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  address TEXT,
  tax_code TEXT,
  representative_name TEXT,
  representative_position TEXT,
  representative_phone TEXT,
  representative_email TEXT,
  fleet JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Only the user can insert/select/update their own company
CREATE POLICY "Users can manage their own company" ON companies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS new_column_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE companies ALTER COLUMN tax_code TYPE VARCHAR(50);
ALTER TABLE companies RENAME COLUMN representative_phone TO rep_phone;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_name_new TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_new TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_code_new TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_name_new TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_position_new TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_phone_new TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_email_new TEXT; 