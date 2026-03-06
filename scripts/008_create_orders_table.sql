-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_value NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- 'money', 'card', 'mixed'
  status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add order_id to sales table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'order_id') THEN
        ALTER TABLE sales ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Optional: Migrate existing sales to individual orders (legacy support)
-- This block attempts to create an order for each existing sale that doesn't have an order_id
DO $$
DECLARE
    sale_record RECORD;
    new_order_id UUID;
BEGIN
    FOR sale_record IN SELECT * FROM sales WHERE order_id IS NULL LOOP
        INSERT INTO orders (total_value, payment_method, created_at, updated_at)
        VALUES (sale_record.total_value, sale_record.payment_method, sale_record.created_at, sale_record.created_at)
        RETURNING id INTO new_order_id;

        UPDATE sales SET order_id = new_order_id WHERE id = sale_record.id;
    END LOOP;
END $$;
