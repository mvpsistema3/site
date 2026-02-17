-- ============================================
-- MELHORIAS NA TABELA ORDERS
-- Data: 2026-01-30
-- Descrição: Adiciona campos para suportar cupons e reservas
-- ============================================

-- Adicionar campos de cupom na tabela orders (se não existirem)
DO $$
BEGIN
  -- Campo para armazenar o código do cupom usado
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'coupon_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN coupon_code TEXT;
    COMMENT ON COLUMN orders.coupon_code IS 'Código do cupom aplicado no pedido';
  END IF;

  -- Campo para armazenar o valor do desconto
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
    COMMENT ON COLUMN orders.discount_amount IS 'Valor total de desconto aplicado';
  END IF;

  -- Campo para armazenar o subtotal (antes do desconto)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal DECIMAL(10,2);
    COMMENT ON COLUMN orders.subtotal IS 'Subtotal antes dos descontos';
  END IF;

  -- Campo para timestamp de reserva
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'reserved_until'
  ) THEN
    ALTER TABLE orders ADD COLUMN reserved_until TIMESTAMP;
    COMMENT ON COLUMN orders.reserved_until IS 'Data/hora de expiração da reserva de estoque';
  END IF;

  -- Campo para indicar se a reserva foi confirmada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'reservation_confirmed'
  ) THEN
    ALTER TABLE orders ADD COLUMN reservation_confirmed BOOLEAN DEFAULT false;
    COMMENT ON COLUMN orders.reservation_confirmed IS 'Indica se a reserva de estoque foi confirmada (pagamento aprovado)';
  END IF;

  -- Campo para armazenar metadados do pagamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_metadata'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_metadata JSONB;
    COMMENT ON COLUMN orders.payment_metadata IS 'Metadados do pagamento (ID da transação, método, etc)';
  END IF;
END $$;

-- Criar índice para buscar pedidos por cupom
CREATE INDEX IF NOT EXISTS idx_orders_coupon_code ON orders(coupon_code) WHERE coupon_code IS NOT NULL;

-- Criar índice para buscar pedidos com reserva expirando
CREATE INDEX IF NOT EXISTS idx_orders_reserved_until ON orders(reserved_until) WHERE reserved_until IS NOT NULL;

-- ============================================
-- FUNÇÃO: Criar pedido com reserva de estoque
-- ============================================
CREATE OR REPLACE FUNCTION create_order_with_reservation(
  p_brand_id UUID,
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_items JSONB, -- Array de {product_id, variant_id, quantity, price}
  p_shipping_address JSONB,
  p_billing_address JSONB,
  p_coupon_code TEXT DEFAULT NULL,
  p_discount_amount DECIMAL DEFAULT 0,
  p_reservation_minutes INTEGER DEFAULT 15
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal DECIMAL;
  v_total DECIMAL;
  v_item JSONB;
BEGIN
  -- Gerar número do pedido
  v_order_number := 'ORD-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Calcular subtotal
  SELECT SUM((item->>'quantity')::INTEGER * (item->>'price')::DECIMAL)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  -- Calcular total
  v_total := v_subtotal - COALESCE(p_discount_amount, 0);

  -- Criar o pedido
  INSERT INTO orders (
    brand_id,
    order_number,
    customer_email,
    customer_name,
    subtotal,
    discount_amount,
    total_amount,
    coupon_code,
    shipping_address,
    billing_address,
    status,
    reserved_until
  ) VALUES (
    p_brand_id,
    v_order_number,
    p_customer_email,
    p_customer_name,
    v_subtotal,
    p_discount_amount,
    v_total,
    p_coupon_code,
    p_shipping_address,
    p_billing_address,
    'pending',
    NOW() + (p_reservation_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO v_order_id;

  -- Criar itens do pedido e reservas de estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Inserir item do pedido
    INSERT INTO order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::DECIMAL,
      (v_item->>'quantity')::INTEGER * (v_item->>'price')::DECIMAL
    );

    -- Criar reserva de estoque
    INSERT INTO stock_reservations (
      order_id,
      product_id,
      variant_id,
      brand_id,
      quantity,
      reserved_until,
      status
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      p_brand_id,
      (v_item->>'quantity')::INTEGER,
      NOW() + (p_reservation_minutes || ' minutes')::INTERVAL,
      'pending'
    );
  END LOOP;

  -- Incrementar uso do cupom se houver
  IF p_coupon_code IS NOT NULL THEN
    UPDATE coupons
    SET usage_count = usage_count + 1
    WHERE
      brand_id = p_brand_id
      AND UPPER(code) = UPPER(p_coupon_code)
      AND active = true;

    -- Registrar uso do cupom
    INSERT INTO coupon_uses (
      coupon_id,
      order_id,
      brand_id,
      discount_applied,
      order_total
    )
    SELECT
      c.id,
      v_order_id,
      p_brand_id,
      p_discount_amount,
      v_subtotal
    FROM coupons c
    WHERE
      c.brand_id = p_brand_id
      AND UPPER(c.code) = UPPER(p_coupon_code);
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_order_with_reservation IS 'Cria um pedido com reserva automática de estoque e aplicação de cupom';

-- ============================================
-- FUNÇÃO: Confirmar pagamento e reserva
-- ============================================
CREATE OR REPLACE FUNCTION confirm_order_payment(
  p_order_id UUID,
  p_payment_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Atualizar pedido
  UPDATE orders
  SET
    status = 'processing',
    reservation_confirmed = true,
    payment_metadata = p_payment_metadata,
    updated_at = NOW()
  WHERE
    id = p_order_id
    AND status = 'pending';

  -- Confirmar reservas de estoque
  UPDATE stock_reservations
  SET
    status = 'confirmed',
    confirmed_at = NOW()
  WHERE
    order_id = p_order_id
    AND status = 'pending';

  -- Atualizar estoque real (decrementar)
  UPDATE product_variants pv
  SET stock = stock - sr.quantity
  FROM stock_reservations sr
  WHERE
    sr.order_id = p_order_id
    AND sr.variant_id = pv.id
    AND sr.status = 'confirmed';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_order_payment IS 'Confirma o pagamento e converte reservas em vendas efetivas';

-- ============================================
-- FUNÇÃO: Cancelar pedido e liberar reservas
-- ============================================
CREATE OR REPLACE FUNCTION cancel_order_and_release_stock(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Cancelar pedido
  UPDATE orders
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE
    id = p_order_id
    AND status IN ('pending', 'processing');

  -- Cancelar reservas
  UPDATE stock_reservations
  SET
    status = 'cancelled',
    cancelled_at = NOW()
  WHERE
    order_id = p_order_id
    AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_order_and_release_stock IS 'Cancela o pedido e libera as reservas de estoque';