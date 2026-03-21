-- ============================================
-- FIX: Salvar product_name, variant_name, sku, product_image_url nos order_items
-- Data: 2026-03-21
-- Descrição: A função create_order_with_reservation não estava salvando
--            os detalhes do produto (nome, variante, sku, imagem) nos order_items.
-- ============================================

CREATE OR REPLACE FUNCTION create_order_with_reservation(
  p_brand_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT '',
  p_customer_email TEXT DEFAULT '',
  p_customer_phone TEXT DEFAULT '',
  p_customer_cpf TEXT DEFAULT '',
  p_items JSONB DEFAULT '[]',
  p_shipping_address JSONB DEFAULT '{}',
  p_billing_address JSONB DEFAULT '{}',
  p_subtotal DECIMAL DEFAULT 0,
  p_shipping_cost DECIMAL DEFAULT 0,
  p_discount DECIMAL DEFAULT 0,
  p_total DECIMAL DEFAULT 0,
  p_coupon_code TEXT DEFAULT NULL,
  p_discount_amount DECIMAL DEFAULT 0,
  p_payment_method TEXT DEFAULT NULL,
  p_installments INTEGER DEFAULT 1,
  p_customer_notes TEXT DEFAULT NULL,
  p_reservation_minutes INTEGER DEFAULT 15
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
  v_brand_slug TEXT;
BEGIN
  -- Buscar slug da marca para gerar número do pedido
  SELECT slug INTO v_brand_slug FROM brands WHERE id = p_brand_id;
  v_order_number := UPPER(COALESCE(LEFT(v_brand_slug, 4), 'ORD')) || '-'
    || TO_CHAR(NOW(), 'YYYY') || '-'
    || LPAD((nextval('order_number_seq'))::TEXT, 4, '0');

  -- Criar o pedido
  INSERT INTO orders (
    brand_id,
    user_id,
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    subtotal,
    shipping_cost,
    discount,
    discount_amount,
    total,
    coupon_code,
    shipping_address,
    status,
    payment_status,
    payment_method,
    installments,
    customer_notes,
    reserved_until
  ) VALUES (
    p_brand_id,
    p_user_id,
    v_order_number,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_cpf,
    p_subtotal,
    p_shipping_cost,
    p_discount,
    p_discount_amount,
    p_total,
    p_coupon_code,
    p_shipping_address,
    'pending',
    'pending',
    p_payment_method,
    p_installments,
    p_customer_notes,
    NOW() + (p_reservation_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO v_order_id;

  -- Criar itens do pedido e reservas de estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Inserir item do pedido COM todos os detalhes do produto
    INSERT INTO order_items (
      order_id,
      brand_id,
      product_id,
      variant_id,
      quantity,
      price,
      subtotal,
      product_name,
      variant_name,
      sku,
      product_image_url
    ) VALUES (
      v_order_id,
      p_brand_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::DECIMAL,
      (v_item->>'quantity')::INTEGER * (v_item->>'price')::DECIMAL,
      COALESCE(v_item->>'product_name', 'Produto'),
      NULLIF(v_item->>'variant_name', ''),
      NULLIF(v_item->>'sku', ''),
      NULLIF(v_item->>'product_image_url', '')
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
      p_subtotal
    FROM coupons c
    WHERE
      c.brand_id = p_brand_id
      AND UPPER(c.code) = UPPER(p_coupon_code);
  END IF;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_order_with_reservation IS 'Cria pedido com reserva de estoque, incluindo detalhes do produto (nome, variante, sku, imagem)';
