-- 1. Cria a tabela de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_value NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- 'money', 'card', 'mixed'
  status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Adiciona a coluna order_id na tabela de Vendas (Sales) se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'order_id') THEN
        ALTER TABLE sales ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Migra vendas antigas para criar pedidos individuais (para não quebrar o histórico)
DO $$
DECLARE
    sale_record RECORD;
    new_order_id UUID;
BEGIN
    FOR sale_record IN SELECT * FROM sales WHERE order_id IS NULL LOOP
        INSERT INTO orders (total_value, payment_method, created_at, updated_at)
        VALUES (sale_record.value, sale_record.payment_method, sale_record.created_at, sale_record.created_at)
        RETURNING id INTO new_order_id;

        UPDATE sales SET order_id = new_order_id WHERE id = sale_record.id;
    END LOOP;
END $$;
