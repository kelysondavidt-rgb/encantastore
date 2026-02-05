
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('money', 'card')) DEFAULT 'money';
