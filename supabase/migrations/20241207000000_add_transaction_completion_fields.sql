-- Add completion tracking fields to vessel_transactions
ALTER TABLE vessel_transactions 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_vessel_transactions_status ON vessel_transactions(status);
CREATE INDEX IF NOT EXISTS idx_vessel_transactions_completed_at ON vessel_transactions(completed_at);

-- Add comments for documentation
COMMENT ON COLUMN vessel_transactions.accepted_at IS 'Timestamp when auction was accepted by seller';
COMMENT ON COLUMN vessel_transactions.rejected_at IS 'Timestamp when auction was rejected by seller';
COMMENT ON COLUMN vessel_transactions.completed_at IS 'Timestamp when transaction was completed';
COMMENT ON COLUMN vessel_transactions.payment_method IS 'Payment method used (cash, bank, mobile)';
