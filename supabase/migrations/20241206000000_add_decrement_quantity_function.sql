-- Function to decrement available quantity from product_orders
CREATE OR REPLACE FUNCTION decrement_quantity(order_id UUID, decrement_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_quantity INTEGER;
    new_quantity INTEGER;
BEGIN
    -- Get current available quantity
    SELECT available_quantity INTO current_quantity
    FROM product_orders
    WHERE id = order_id;
    
    -- Check if we have enough quantity
    IF current_quantity IS NULL THEN
        RAISE EXCEPTION 'Product order not found';
    END IF;
    
    IF current_quantity < decrement_amount THEN
        RAISE EXCEPTION 'Insufficient quantity available';
    END IF;
    
    -- Calculate new quantity
    new_quantity := current_quantity - decrement_amount;
    
    -- Update the product order
    UPDATE product_orders
    SET available_quantity = new_quantity
    WHERE id = order_id;
    
    RETURN new_quantity;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION decrement_quantity(UUID, INTEGER) TO authenticated;
