-- Consolidação de Migrações para o Sistema de Vendas e Pedidos

-- 1. Tabela de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_value NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL, -- 'money', 'card', 'mixed'
  status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Atualizar Tabela de Vendas (Sales)
-- Adicionar coluna order_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'order_id') THEN
        ALTER TABLE sales ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Migrar Vendas Antigas (Órfãs) para Pedidos Individuais
-- Isso garante que todas as vendas tenham um pedido associado e apareçam na nova tela
DO $$
DECLARE
    sale_record RECORD;
    new_order_id UUID;
BEGIN
    FOR sale_record IN SELECT * FROM sales WHERE order_id IS NULL LOOP
        -- Cria um pedido para cada venda antiga
        INSERT INTO orders (total_value, payment_method, created_at, updated_at)
        VALUES (sale_record.value, sale_record.payment_method, sale_record.sale_date, sale_record.created_at)
        RETURNING id INTO new_order_id;

        -- Atualiza a venda com o ID do novo pedido
        UPDATE sales SET order_id = new_order_id WHERE id = sale_record.id;
    END LOOP;
END $$;

-- 4. Garantir que prices_with_card existe na tabela products
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_with_card DECIMAL(10, 2);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
