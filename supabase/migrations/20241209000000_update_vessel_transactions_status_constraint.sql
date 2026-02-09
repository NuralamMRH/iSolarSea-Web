-- Drop the existing status constraint
ALTER TABLE vessel_transactions DROP CONSTRAINT IF EXISTS vessel_transactions_status_check;

-- Add the new status constraint with all required statuses
ALTER TABLE vessel_transactions ADD CONSTRAINT vessel_transactions_status_check 
CHECK (status::text = ANY (ARRAY[
    'pending'::character varying::text,
    'completed'::character varying::text,
    'cancelled'::character varying::text,
    'AuctionAccept'::character varying::text,
    '2BuyListing'::character varying::text,
    '2ShareLoading'::character varying::text,
    '4ShareLoading'::character varying::text,
    'rejected'::character varying::text
]));
