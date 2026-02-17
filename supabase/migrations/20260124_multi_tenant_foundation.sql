-- ============================================
-- MULTI-TENANT E-COMMERCE - FOUNDATION (CORRIGIDO)
-- Data: 2026-01-24
-- Versão: 2.0 (com todas as correções aplicadas)
-- ============================================

-- ============================================
-- 1. HELPER FUNCTION: Atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Atualiza automaticamente campo updated_at ao fazer UPDATE';

-- ============================================
-- 2. TABELA CENTRAL: BRANDS
-- ============================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,

  -- Configurações visuais (armazenadas em JSON)
  theme JSONB NOT NULL DEFAULT '{
    "primaryColor": "#00FFFF",
    "secondaryColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "textColor": "#000000",
    "logo": "/logos/default.svg",
    "favicon": "/favicons/default.ico",
    "font": "Inter"
  }'::jsonb,

  -- Feature flags (ativa/desativa funcionalidades por marca)
  features JSONB NOT NULL DEFAULT '{
    "installments": true,
    "loyalty": false,
    "giftCards": false,
    "reviews": true
  }'::jsonb,

  -- Configurações de negócio
  settings JSONB NOT NULL DEFAULT '{
    "minOrderValue": 50.00,
    "freeShippingThreshold": 200.00,
    "maxInstallments": 12
  }'::jsonb,

  -- Controle
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_brands_domain ON brands(domain);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_active ON brands(active);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE brands IS 'Tabela central - cada registro representa uma marca do sistema. API Keys devem estar em variáveis de ambiente!';
COMMENT ON COLUMN brands.slug IS 'Identificador único em lowercase (usado no código)';
COMMENT ON COLUMN brands.domain IS 'Domínio principal da marca (sem www)';
COMMENT ON COLUMN brands.theme IS 'Configurações visuais (cores, logo, fonte)';
COMMENT ON COLUMN brands.features IS 'Feature flags - ativa/desativa funcionalidades';

-- ============================================
-- 3. PRODUCTS (Multi-tenant) - COM SOFT DELETE
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Informações básicas
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Preços
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost DECIMAL(10,2),

  -- Categorização
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Status
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  available_for_sale BOOLEAN DEFAULT true,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Soft Delete
  deleted_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(brand_id, slug),
  CHECK (price >= 0),
  CHECK (compare_at_price IS NULL OR compare_at_price >= price)
);

-- Índices otimizados
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_brand_active ON products(brand_id, active);
CREATE INDEX idx_products_brand_category ON products(brand_id, category);
CREATE INDEX idx_products_brand_featured ON products(brand_id, featured) WHERE featured = true;
CREATE INDEX idx_products_slug ON products(brand_id, slug);
CREATE INDEX idx_products_deleted ON products(brand_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_tags ON products USING gin(tags) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE products IS 'Produtos - cada produto pertence a uma marca específica';
COMMENT ON COLUMN products.brand_id IS 'Marca dona deste produto (obrigatório)';
COMMENT ON COLUMN products.slug IS 'URL amigável (único por marca)';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete - quando não é NULL, produto está deletado';

-- ============================================
-- 4. PRODUCT_IMAGES - SEM brand_id redundante
-- ============================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Dados da imagem
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,

  -- Metadata
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_position ON product_images(product_id, position);

COMMENT ON TABLE product_images IS 'Imagens dos produtos (múltiplas por produto)';
COMMENT ON COLUMN product_images.position IS 'Ordem de exibição (0 = imagem principal)';

-- ============================================
-- 5. PRODUCT_VARIANTS - SEM brand_id + SKU GLOBAL
-- ============================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Variação
  color TEXT,
  color_hex TEXT,
  size TEXT,

  -- Identificação (SKU único GLOBALMENTE)
  sku TEXT UNIQUE,
  barcode TEXT,

  -- Estoque
  stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0,

  -- Logística
  weight DECIMAL(10,2),
  dimensions JSONB,

  -- Controle
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(product_id, color, size),
  CHECK (stock >= 0),
  CHECK (reserved_stock >= 0),
  CHECK (reserved_stock <= stock)
);

-- Índices
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_product_active ON product_variants(product_id) WHERE active = true AND deleted_at IS NULL;
CREATE INDEX idx_variants_deleted ON product_variants(product_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_variants_stock ON product_variants(stock) WHERE stock > 0 AND deleted_at IS NULL;

-- Trigger
CREATE TRIGGER update_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE product_variants IS 'Variações de produtos (cor/tamanho/estoque)';
COMMENT ON COLUMN product_variants.sku IS 'Stock Keeping Unit - código ÚNICO GLOBAL';
COMMENT ON COLUMN product_variants.reserved_stock IS 'Estoque temporariamente reservado';
COMMENT ON COLUMN product_variants.deleted_at IS 'Soft delete';

-- ============================================
-- 6. COLLECTIONS - COM SOFT DELETE
-- ============================================
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Informações
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Visual
  banner_url TEXT,
  banner_mobile_url TEXT,

  -- Controle
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,

  -- Período (opcional)
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(brand_id, slug)
);

-- Índices
CREATE INDEX idx_collections_brand ON collections(brand_id);
CREATE INDEX idx_collections_brand_active ON collections(brand_id, active);
CREATE INDEX idx_collections_slug ON collections(brand_id, slug);
CREATE INDEX idx_collections_dates ON collections(brand_id, start_date, end_date);
CREATE INDEX idx_collections_deleted ON collections(brand_id, deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE collections IS 'Coleções de produtos (agrupamentos temáticos)';
COMMENT ON COLUMN collections.deleted_at IS 'Soft delete';

-- ============================================
-- 7. COLLECTION_PRODUCTS - SEM brand_id redundante
-- ============================================
CREATE TABLE collection_products (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  position INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (collection_id, product_id)
);

-- Índices
CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX idx_collection_products_product ON collection_products(product_id);

COMMENT ON TABLE collection_products IS 'Produtos que pertencem a cada coleção';

-- ============================================
-- 8. ORDERS - COM ÍNDICES ADICIONAIS
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  -- Número do pedido (visível ao cliente)
  order_number TEXT UNIQUE NOT NULL,

  -- Dados do cliente
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_cpf TEXT NOT NULL,

  -- Endereço de entrega (JSON para flexibilidade)
  shipping_address JSONB NOT NULL,

  -- Valores
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Status do pedido
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_status TEXT DEFAULT 'unfulfilled',

  -- Integração Asaas
  asaas_payment_id TEXT,
  asaas_invoice_url TEXT,
  payment_method TEXT,
  installments INTEGER DEFAULT 1,

  -- Rastreamento
  tracking_code TEXT,
  tracking_url TEXT,

  -- Notas
  customer_notes TEXT,
  internal_notes TEXT,

  -- Datas importantes
  paid_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CHECK (total >= 0),
  CHECK (subtotal >= 0),
  CHECK (shipping_cost >= 0),
  CHECK (installments >= 1),
  CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'))
);

-- Índices para queries comuns
CREATE INDEX idx_orders_brand ON orders(brand_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(brand_id, status);
CREATE INDEX idx_orders_payment_status ON orders(brand_id, payment_status);
CREATE INDEX idx_orders_created ON orders(brand_id, created_at DESC);
CREATE INDEX idx_orders_asaas ON orders(asaas_payment_id);
CREATE INDEX idx_orders_customer_cpf ON orders(brand_id, customer_cpf);
CREATE INDEX idx_orders_customer_email ON orders(brand_id, customer_email);
CREATE INDEX idx_orders_payment_method ON orders(brand_id, payment_method);

-- Trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE orders IS 'Pedidos realizados no e-commerce';
COMMENT ON COLUMN orders.order_number IS 'Número do pedido visível ao cliente';
COMMENT ON COLUMN orders.asaas_payment_id IS 'ID da cobrança no gateway Asaas';

-- ============================================
-- 9. ORDER_ITEMS - MANTÉM brand_id para relatórios
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Snapshot do produto no momento da compra (imutável)
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,

  -- Valores (congelados no momento da compra)
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,

  -- Imagem do produto (snapshot)
  product_image_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CHECK (quantity > 0),
  CHECK (price >= 0),
  CHECK (subtotal = price * quantity)
);

-- Índices
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_brand ON order_items(brand_id);

COMMENT ON TABLE order_items IS 'Itens de cada pedido (snapshot imutável)';
COMMENT ON COLUMN order_items.product_name IS 'Nome congelado no momento da compra';
COMMENT ON COLUMN order_items.brand_id IS 'Mantido para relatórios diretos sem JOINs';

-- ============================================
-- 10. BANNERS - COM SOFT DELETE
-- ============================================
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Conteúdo
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,

  -- CTA (Call to Action)
  cta_text TEXT,
  cta_link TEXT,

  -- Posicionamento
  position INTEGER DEFAULT 0,

  -- Controle
  active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,
  start_date TIMESTAMP,
  end_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_banners_brand ON banners(brand_id);
CREATE INDEX idx_banners_brand_active ON banners(brand_id, active);
CREATE INDEX idx_banners_position ON banners(brand_id, position);
CREATE INDEX idx_banners_deleted ON banners(brand_id, deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE banners IS 'Banners promocionais da home page';
COMMENT ON COLUMN banners.deleted_at IS 'Soft delete';

-- ============================================
-- 11. FUNCTION: Gerar Order Number (SEM RACE CONDITION)
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  brand_slug TEXT;
  year_part TEXT;
  last_number INTEGER;
  new_order_number TEXT;
BEGIN
  -- Pegar slug da marca
  SELECT slug INTO brand_slug
  FROM brands
  WHERE id = NEW.brand_id;

  -- Ano atual
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Buscar último número COM LOCK (evita race condition)
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)),
    0
  ) INTO last_number
  FROM orders
  WHERE brand_id = NEW.brand_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  FOR UPDATE;  -- ✅ LOCK para evitar duplicação

  -- Montar número do pedido (ex: SESH-2026-0001)
  new_order_number := UPPER(brand_slug) || '-' || year_part || '-' || LPAD((last_number + 1)::TEXT, 4, '0');

  NEW.order_number := new_order_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que executa antes de inserir novo pedido
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

COMMENT ON FUNCTION generate_order_number() IS 'Gera número de pedido único com lock para evitar duplicação';

-- ============================================
-- 12. ATIVAR ROW LEVEL SECURITY
-- ============================================
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. POLICIES: SELECT (Leitura Pública)
-- ============================================

-- Brands: todos podem ler marcas ativas
CREATE POLICY "Public can read active brands"
  ON brands FOR SELECT
  USING (active = true);

-- Products: todos podem ler produtos ativos e não deletados
CREATE POLICY "Public can read active products"
  ON products FOR SELECT
  USING (active = true AND available_for_sale = true AND deleted_at IS NULL);

-- Product Images: públicas (verifica se produto está ativo)
CREATE POLICY "Public can read product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
        AND products.active = true
        AND products.deleted_at IS NULL
    )
  );

-- Product Variants: apenas com estoque e não deletados
CREATE POLICY "Public can read variants with stock"
  ON product_variants FOR SELECT
  USING (
    active = true AND
    stock > 0 AND
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
        AND products.active = true
        AND products.deleted_at IS NULL
    )
  );

-- Collections: apenas ativas e não deletadas
CREATE POLICY "Public can read active collections"
  ON collections FOR SELECT
  USING (active = true AND deleted_at IS NULL);

-- Collection Products: públicos
CREATE POLICY "Public can read collection products"
  ON collection_products FOR SELECT
  USING (true);

-- Banners: apenas ativos, não deletados e dentro do período
CREATE POLICY "Public can read active banners"
  ON banners FOR SELECT
  USING (
    active = true AND
    deleted_at IS NULL AND
    (start_date IS NULL OR start_date <= NOW()) AND
    (end_date IS NULL OR end_date >= NOW())
  );

-- ============================================
-- 14. POLICIES: ORDERS (Acesso Restrito)
-- ============================================

-- Orders: usuário só vê seus próprios pedidos
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Order Items: usuário só vê itens de seus pedidos
CREATE POLICY "Users can read own order items"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Insert: qualquer um pode criar pedido (guest checkout)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 15. VIEW HELPER - Products com Brand Info
-- ============================================
CREATE OR REPLACE VIEW products_with_brand AS
SELECT
  p.*,
  b.slug as brand_slug,
  b.name as brand_name,
  b.domain as brand_domain
FROM products p
JOIN brands b ON p.brand_id = b.id
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW products_with_brand IS 'Produtos com informações da marca (facilita queries)';

-- ============================================
-- 16. VALIDAÇÃO JSONB (Funções Helper)
-- ============================================
CREATE OR REPLACE FUNCTION validate_brand_theme(theme JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    theme ? 'primaryColor' AND
    theme ? 'secondaryColor' AND
    theme ? 'backgroundColor' AND
    theme ? 'textColor' AND
    theme ? 'logo' AND
    theme ? 'favicon' AND
    theme ? 'font'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_brand_features(features JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    features ? 'installments' AND
    features ? 'loyalty' AND
    features ? 'giftCards' AND
    features ? 'reviews'
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_brand_settings(settings JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    settings ? 'minOrderValue' AND
    settings ? 'freeShippingThreshold' AND
    settings ? 'maxInstallments'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_brand_theme IS 'Valida estrutura do JSON de tema';
COMMENT ON FUNCTION validate_brand_features IS 'Valida estrutura do JSON de features';
COMMENT ON FUNCTION validate_brand_settings IS 'Valida estrutura do JSON de settings';

-- ============================================
-- ✅ MIGRATION COMPLETA!
-- ============================================
