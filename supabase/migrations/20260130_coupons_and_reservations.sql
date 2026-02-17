-- ============================================
-- CUPONS E RESERVAS DE ESTOQUE
-- Data: 2026-01-30
-- Descrição: Adiciona tabelas para gerenciar cupons de desconto e reservas de estoque
-- ============================================

-- ============================================
-- 1. TABELA: COUPONS (Cupons de desconto)
-- ============================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Identificação
  code TEXT NOT NULL,
  description TEXT,

  -- Configuração do desconto
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),

  -- Restrições
  minimum_purchase DECIMAL(10,2),
  maximum_discount DECIMAL(10,2), -- Para cupons percentuais, limitar o desconto máximo

  -- Limites de uso
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,

  -- Validade
  valid_from TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMP,

  -- Status
  active BOOLEAN DEFAULT true,

  -- Controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,

  -- Constraint única para código + marca
  CONSTRAINT unique_coupon_per_brand UNIQUE(brand_id, code)
);

-- Índices para performance
CREATE INDEX idx_coupons_brand_id ON coupons(brand_id);
CREATE INDEX idx_coupons_code ON coupons(UPPER(code));
CREATE INDEX idx_coupons_active ON coupons(active) WHERE active = true;
CREATE INDEX idx_coupons_valid_dates ON coupons(valid_from, valid_until);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE coupons IS 'Cupons de desconto por marca';
COMMENT ON COLUMN coupons.discount_type IS 'percentage = desconto percentual | fixed = desconto fixo em reais';
COMMENT ON COLUMN coupons.minimum_purchase IS 'Valor mínimo da compra para aplicar o cupom';
COMMENT ON COLUMN coupons.maximum_discount IS 'Valor máximo de desconto (útil para cupons percentuais)';
COMMENT ON COLUMN coupons.usage_limit IS 'Limite total de usos do cupom (null = ilimitado)';
COMMENT ON COLUMN coupons.usage_count IS 'Contador de quantas vezes o cupom foi usado';

-- ============================================
-- 2. TABELA: STOCK_RESERVATIONS (Reservas de estoque)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Dados da reserva
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_until TIMESTAMP NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),

  -- Controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  expired_at TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_stock_reservations_order_id ON stock_reservations(order_id);
CREATE INDEX idx_stock_reservations_product_id ON stock_reservations(product_id);
CREATE INDEX idx_stock_reservations_variant_id ON stock_reservations(variant_id);
CREATE INDEX idx_stock_reservations_brand_id ON stock_reservations(brand_id);
CREATE INDEX idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX idx_stock_reservations_reserved_until ON stock_reservations(reserved_until);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_stock_reservations_updated_at
  BEFORE UPDATE ON stock_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE stock_reservations IS 'Reservas temporárias de estoque para pedidos pendentes';
COMMENT ON COLUMN stock_reservations.reserved_until IS 'Data/hora de expiração da reserva';
COMMENT ON COLUMN stock_reservations.status IS 'pending = aguardando pagamento | confirmed = pagamento confirmado | cancelled = cancelado | expired = expirado';

-- ============================================
-- 3. TABELA: COUPON_USES (Histórico de uso de cupons)
-- ============================================
CREATE TABLE IF NOT EXISTS coupon_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Dados do uso
  discount_applied DECIMAL(10,2) NOT NULL,
  order_total DECIMAL(10,2) NOT NULL,

  -- Controle
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_coupon_uses_coupon_id ON coupon_uses(coupon_id);
CREATE INDEX idx_coupon_uses_order_id ON coupon_uses(order_id);
CREATE INDEX idx_coupon_uses_brand_id ON coupon_uses(brand_id);

-- Comentários
COMMENT ON TABLE coupon_uses IS 'Histórico de uso dos cupons';
COMMENT ON COLUMN coupon_uses.discount_applied IS 'Valor do desconto aplicado neste pedido';
COMMENT ON COLUMN coupon_uses.order_total IS 'Valor total do pedido antes do desconto';

-- ============================================
-- 4. FUNÇÃO: Incrementar uso de cupom
-- ============================================
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET usage_count = usage_count + 1
  WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_coupon_usage IS 'Incrementa o contador de uso de um cupom';

-- ============================================
-- 5. FUNÇÃO: Verificar e expirar reservas
-- ============================================
CREATE OR REPLACE FUNCTION expire_stock_reservations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Marcar como expiradas todas as reservas pendentes que passaram do prazo
  UPDATE stock_reservations
  SET
    status = 'expired',
    expired_at = NOW()
  WHERE
    status = 'pending'
    AND reserved_until < NOW();

  -- Retornar quantas foram expiradas
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_stock_reservations IS 'Expira reservas de estoque que passaram do prazo';

-- ============================================
-- 6. FUNÇÃO: Calcular estoque disponível
-- ============================================
CREATE OR REPLACE FUNCTION get_available_stock(p_product_id UUID, p_variant_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  total_stock INTEGER;
  reserved_stock INTEGER;
BEGIN
  -- Obter estoque total
  IF p_variant_id IS NOT NULL THEN
    SELECT stock INTO total_stock
    FROM product_variants
    WHERE id = p_variant_id;
  ELSE
    SELECT stock INTO total_stock
    FROM products
    WHERE id = p_product_id;
  END IF;

  -- Calcular reservas ativas
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
  FROM stock_reservations
  WHERE
    product_id = p_product_id
    AND (p_variant_id IS NULL OR variant_id = p_variant_id)
    AND status = 'pending'
    AND reserved_until > NOW();

  -- Retornar estoque disponível
  RETURN GREATEST(0, COALESCE(total_stock, 0) - reserved_stock);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_stock IS 'Calcula estoque disponível considerando reservas ativas';

-- ============================================
-- 7. RLS (Row Level Security)
-- ============================================

-- COUPONS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons are viewable by everyone" ON coupons
  FOR SELECT USING (active = true AND deleted_at IS NULL);

CREATE POLICY "Coupons are insertable by authenticated users" ON coupons
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Coupons are updatable by authenticated users" ON coupons
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- STOCK_RESERVATIONS
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stock reservations are viewable by everyone" ON stock_reservations
  FOR SELECT USING (true);

CREATE POLICY "Stock reservations are insertable by everyone" ON stock_reservations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Stock reservations are updatable by everyone" ON stock_reservations
  FOR UPDATE USING (true);

-- COUPON_USES
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupon uses are viewable by everyone" ON coupon_uses
  FOR SELECT USING (true);

CREATE POLICY "Coupon uses are insertable by everyone" ON coupon_uses
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 8. DADOS DE EXEMPLO (SEED DATA)
-- ============================================

-- Inserir cupons de exemplo para cada marca
INSERT INTO coupons (brand_id, code, description, discount_type, discount_value, minimum_purchase, valid_from, valid_until, active)
SELECT
  b.id,
  'PRIMEIRA10',
  'Desconto de 10% na primeira compra',
  'percentage',
  10.00,
  50.00,
  NOW(),
  NOW() + INTERVAL '90 days',
  true
FROM brands b
WHERE NOT EXISTS (
  SELECT 1 FROM coupons WHERE brand_id = b.id AND code = 'PRIMEIRA10'
);

INSERT INTO coupons (brand_id, code, description, discount_type, discount_value, minimum_purchase, maximum_discount, valid_from, active)
SELECT
  b.id,
  'FRETEGRATIS',
  'Frete grátis em compras acima de R$ 100',
  'fixed',
  20.00,
  100.00,
  20.00,
  NOW(),
  true
FROM brands b
WHERE NOT EXISTS (
  SELECT 1 FROM coupons WHERE brand_id = b.id AND code = 'FRETEGRATIS'
);

INSERT INTO coupons (brand_id, code, description, discount_type, discount_value, minimum_purchase, maximum_discount, usage_limit, valid_from, valid_until, active)
SELECT
  b.id,
  'VIP20',
  'Desconto VIP de 20% - Limitado!',
  'percentage',
  20.00,
  150.00,
  100.00,
  50,
  NOW(),
  NOW() + INTERVAL '30 days',
  true
FROM brands b
WHERE NOT EXISTS (
  SELECT 1 FROM coupons WHERE brand_id = b.id AND code = 'VIP20'
);

-- ============================================
-- 9. COMENTÁRIOS FINAIS
-- ============================================
COMMENT ON SCHEMA public IS 'Schema principal com tabelas de cupons e reservas de estoque implementadas';