-- Create OCR documents table
CREATE TABLE ocr_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  file_path TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  vessel_name TEXT,
  owner_name TEXT,
  engine_power TEXT,
  length TEXT,
  width TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ocr_documents ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their documents
CREATE POLICY "Users can view their own documents"
  ON ocr_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own documents
CREATE POLICY "Users can insert their own documents"
  ON ocr_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);