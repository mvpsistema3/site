# Especificação Técnica: Sistema Multi-Tenant E-commerce

## 📋 Documento para Execução - Claude Code

**Versão:** 1.0  
**Data:** 24 de Janeiro de 2026  
**Objetivo:** Transformar Sesh Store em sistema multi-tenant com gateway Asaas

---

## 🎯 Visão Geral do Projeto

### Contexto Atual
- **Projeto Base:** Sesh Store (e-commerce streetwear)
- **Stack Atual:** React 19 + TypeScript + Vite + Supabase + Stripe
- **Problema:** Precisa escalar para múltiplas marcas sem duplicar código

### Objetivo Final
Criar sistema que:
1. Suporte **múltiplas marcas** (A, B, C, D...) com domínios independentes
2. Compartilhe **1 única base de código** (monolito multi-tenant)
3. Use **Asaas** como gateway de pagamento (substituindo Stripe)
4. Cada marca tenha **dados isolados** no banco (mesmo Supabase)
5. Deploy único sirva **todos os domínios** (ex: seshstore.com.br, marcab.com.br)

### Princípio Fundamental: Multi-Tenancy

**TODAS as tabelas do banco devem ter `brand_id`**

```sql
-- ❌ ERRADO (tabela sem brand_id)
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name TEXT
);

-- ✅ CORRETO (tabela multi-tenant)
CREATE TABLE products (
  id UUID PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),  -- ← OBRIGATÓRIO
  name TEXT
);
```

**Por quê?**
- Dados da Marca A nunca se misturam com Marca B
- Queries filtram automaticamente por marca
- Segurança garantida por Row Level Security (RLS)

---

## 🏗️ Arquitetura do Sistema

### Fluxo de Funcionamento

```
Usuário acessa domínio
       ↓
seshstore.com.br → detectBrand() → 'sesh' → Queries filtram por brand_id da Sesh
marcab.com.br    → detectBrand() → 'marcaB' → Queries filtram por brand_id da Marca B
marcac.com.br    → detectBrand() → 'marcaC' → Queries filtram por brand_id da Marca C
       ↓
Renderiza UI com tema/logo/cores da marca
       ↓
Supabase retorna apenas dados desta marca (RLS garante isolamento)
```

### Estrutura de Diretórios

```
sesh-store/
├── src/
│   ├── lib/
│   │   ├── supabase.ts              # Cliente Supabase (já existe)
│   │   ├── asaas.ts                 # ← CRIAR: Cliente Asaas
│   │   ├── brand-detection.ts       # ← CRIAR: Detecta marca pelo domínio
│   │   ├── queryClient.ts           # React Query (já existe)
│   │   └── utils.ts                 # Utilitários (já existe)
│   │
│   ├── config/
│   │   └── brands.ts                # ← CRIAR: Configurações das marcas
│   │
│   ├── contexts/
│   │   └── BrandContext.tsx         # ← CRIAR: Context da marca atual
│   │
│   ├── hooks/
│   │   ├── useProducts.ts           # ← MODIFICAR: Adicionar filtro brand_id
│   │   ├── useCollections.ts        # ← MODIFICAR: Adicionar filtro brand_id
│   │   ├── useOrders.ts             # ← MODIFICAR: Adicionar filtro brand_id
│   │   ├── useBrand.ts              # ← CRIAR: Hook para acessar marca
│   │   └── useAsaas.ts              # ← CRIAR: Integração com Asaas
│   │
│   ├── types/
│   │   ├── database.ts              # ← MODIFICAR: Adicionar brand_id
│   │   └── asaas.ts                 # ← CRIAR: Types da API Asaas
│   │
│   ├── components/                  # Componentes existentes (manter)
│   ├── pages/                       # Páginas existentes (manter)
│   └── App.tsx                      # ← MODIFICAR: Adicionar BrandProvider
│
├── supabase/
│   ├── migrations/
│   │   └── 20260124_multi_tenant.sql  # ← CRIAR: Migration multi-tenant
│   └── seed.sql                       # ← CRIAR: Dados das 3 marcas
│
├── .env.local.example               # ← MODIFICAR: Adicionar vars Asaas
├── package.json                     # ← MODIFICAR: Remover Stripe, adicionar libs
└── README.md
```

---

## 🗄️ Schema do Banco de Dados (Supabase)

### 1. Tabela Central: BRANDS

**Esta é a tabela mestre** - todas as outras referenciam ela.

```sql
-- ============================================
-- TABELA CENTRAL: BRANDS
-- ============================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  slug TEXT UNIQUE NOT NULL,                    -- 'sesh', 'marcaB', 'marcaC'
  name TEXT NOT NULL,                           -- 'Sesh Store', 'Marca B', 'Marca C'
  domain TEXT UNIQUE NOT NULL,                  -- 'seshstore.com.br', 'marcab.com.br'
  
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
  
  -- Integração Asaas (cada marca tem sua própria conta/subconta)
  asaas_api_key TEXT,                           -- API Key do Asaas
  asaas_wallet_id TEXT,                         -- ID da subconta/carteira
  asaas_environment TEXT DEFAULT 'sandbox',     -- 'sandbox' ou 'production'
  
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

COMMENT ON TABLE brands IS 'Tabela central - cada registro representa uma marca do sistema';
COMMENT ON COLUMN brands.slug IS 'Identificador único em lowercase (usado no código)';
COMMENT ON COLUMN brands.domain IS 'Domínio principal da marca (sem www)';
COMMENT ON COLUMN brands.theme IS 'Configurações visuais (cores, logo, fonte)';
COMMENT ON COLUMN brands.features IS 'Feature flags - ativa/desativa funcionalidades';
```

### 2. Tabela: PRODUCTS

**Produtos são específicos de cada marca.**

```sql
-- ============================================
-- PRODUCTS (Multi-tenant)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← CHAVE DA MARCA
  
  -- Informações básicas
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Preços
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),               -- Preço "de" (para promoções)
  cost DECIMAL(10,2),                           -- Custo (uso interno/admin)
  
  -- Categorização
  category TEXT NOT NULL,                       -- 'camisetas', 'moletons', 'acessorios'
  subcategory TEXT,                             -- 'manga-longa', 'manga-curta'
  tags TEXT[] DEFAULT '{}',                     -- ['streetwear', 'skate', 'premium']
  
  -- Status
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,               -- Produto em destaque na home
  available_for_sale BOOLEAN DEFAULT true,      -- Disponível para venda
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(brand_id, slug),                       -- Slug único por marca
  CHECK (price >= 0),
  CHECK (compare_at_price IS NULL OR compare_at_price >= price)
);

-- Índices otimizados para queries comuns
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_brand_active ON products(brand_id, active);
CREATE INDEX idx_products_brand_category ON products(brand_id, category);
CREATE INDEX idx_products_brand_featured ON products(brand_id, featured) WHERE featured = true;
CREATE INDEX idx_products_slug ON products(brand_id, slug);

-- Trigger para updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE products IS 'Produtos - cada produto pertence a uma marca específica';
COMMENT ON COLUMN products.brand_id IS 'Marca dona deste produto (obrigatório)';
COMMENT ON COLUMN products.slug IS 'URL amigável (único por marca)';
```

### 3. Tabela: PRODUCT_IMAGES

**Imagens dos produtos (1 produto pode ter N imagens).**

```sql
-- ============================================
-- PRODUCT_IMAGES (Multi-tenant)
-- ============================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← Redundante mas útil para RLS
  
  -- Dados da imagem
  url TEXT NOT NULL,                            -- URL no Supabase Storage
  alt_text TEXT,                                -- Texto alternativo (SEO/acessibilidade)
  position INTEGER DEFAULT 0,                   -- Ordem de exibição (0 = primeira)
  
  -- Metadata
  width INTEGER,                                -- Largura original
  height INTEGER,                               -- Altura original
  size_bytes INTEGER,                           -- Tamanho do arquivo
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_brand ON product_images(brand_id);
CREATE INDEX idx_product_images_position ON product_images(product_id, position);

COMMENT ON TABLE product_images IS 'Imagens dos produtos (múltiplas por produto)';
COMMENT ON COLUMN product_images.position IS 'Ordem de exibição (0 = imagem principal)';
```

### 4. Tabela: PRODUCT_VARIANTS

**Variações de produto (cores e tamanhos).**

```sql
-- ============================================
-- PRODUCT_VARIANTS (Cores e Tamanhos)
-- ============================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← Chave da marca
  
  -- Variação
  color TEXT,                                   -- 'Preto', 'Branco', 'Azul'
  color_hex TEXT,                               -- '#000000', '#FFFFFF', '#0000FF'
  size TEXT,                                    -- 'P', 'M', 'G', 'GG', 'XG'
  
  -- Identificação
  sku TEXT UNIQUE,                              -- Código único (ex: 'SESH-CAM-001-P-BLK')
  barcode TEXT,                                 -- Código de barras (EAN)
  
  -- Estoque
  stock INTEGER DEFAULT 0,                      -- Quantidade disponível
  reserved_stock INTEGER DEFAULT 0,             -- Estoque reservado (carrinho não finalizado)
  
  -- Logística
  weight DECIMAL(10,2),                         -- Peso em KG (para cálculo de frete)
  dimensions JSONB,                             -- {width: 20, height: 30, length: 5} em CM
  
  -- Controle
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(product_id, color, size),              -- Combinação única
  CHECK (stock >= 0),
  CHECK (reserved_stock >= 0),
  CHECK (reserved_stock <= stock)
);

-- Índices
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_brand ON product_variants(brand_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_stock ON product_variants(brand_id, stock) WHERE stock > 0;

-- Trigger
CREATE TRIGGER update_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE product_variants IS 'Variações de produtos (cor/tamanho/estoque)';
COMMENT ON COLUMN product_variants.sku IS 'Stock Keeping Unit - código único do item';
COMMENT ON COLUMN product_variants.reserved_stock IS 'Estoque temporariamente reservado';
```

### 5. Tabela: COLLECTIONS

**Coleções/Landing Pages (ex: "Inverno 2025", "Black Friday").**

```sql
-- ============================================
-- COLLECTIONS (Coleções/Landing Pages)
-- ============================================
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← Chave da marca
  
  -- Informações
  name TEXT NOT NULL,                           -- 'Inverno 2025', 'Black Friday'
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Visual
  banner_url TEXT,                              -- Imagem de capa
  banner_mobile_url TEXT,                       -- Banner para mobile (opcional)
  
  -- Controle
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,               -- Destaque na home
  
  -- Período (opcional)
  start_date TIMESTAMP,                         -- Quando a coleção fica ativa
  end_date TIMESTAMP,                           -- Quando a coleção expira
  
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

COMMENT ON TABLE collections IS 'Coleções de produtos (agrupamentos temáticos)';
```

### 6. Tabela: COLLECTION_PRODUCTS

**Relação N:N entre coleções e produtos.**

```sql
-- ============================================
-- COLLECTION_PRODUCTS (Relação N:N)
-- ============================================
CREATE TABLE collection_products (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← Chave da marca
  
  position INTEGER DEFAULT 0,                   -- Ordem de exibição
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (collection_id, product_id)
);

-- Índices
CREATE INDEX idx_collection_products_collection ON collection_products(collection_id);
CREATE INDEX idx_collection_products_product ON collection_products(product_id);
CREATE INDEX idx_collection_products_brand ON collection_products(brand_id);

COMMENT ON TABLE collection_products IS 'Produtos que pertencem a cada coleção';
```

### 7. Tabela: ORDERS

**Pedidos realizados.**

```sql
-- ============================================
-- ORDERS (Pedidos)
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← Chave da marca
  user_id UUID REFERENCES auth.users(id),       -- Usuário (NULL se guest checkout)
  
  -- Número do pedido (visível ao cliente)
  order_number TEXT UNIQUE NOT NULL,            -- Gerado automaticamente (ex: 'SESH-2026-0001')
  
  -- Dados do cliente
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_cpf TEXT NOT NULL,
  
  -- Endereço de entrega (JSON para flexibilidade)
  shipping_address JSONB NOT NULL,              -- { cep, rua, numero, complemento, bairro, cidade, estado }
  
  -- Valores
  subtotal DECIMAL(10,2) NOT NULL,              -- Soma dos produtos
  shipping_cost DECIMAL(10,2) NOT NULL,         -- Custo do frete
  discount DECIMAL(10,2) DEFAULT 0,             -- Descontos aplicados
  total DECIMAL(10,2) NOT NULL,                 -- Valor final
  
  -- Status do pedido
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  fulfillment_status TEXT DEFAULT 'unfulfilled', -- 'unfulfilled', 'fulfilled', 'partially_fulfilled'
  
  -- Integração Asaas
  asaas_payment_id TEXT,                        -- ID da cobrança no Asaas
  asaas_invoice_url TEXT,                       -- URL do boleto/PIX
  payment_method TEXT,                          -- 'credit_card', 'boleto', 'pix'
  installments INTEGER DEFAULT 1,               -- Número de parcelas
  
  -- Rastreamento
  tracking_code TEXT,                           -- Código de rastreio dos Correios
  tracking_url TEXT,                            -- URL de rastreamento
  
  -- Notas
  customer_notes TEXT,                          -- Observações do cliente
  internal_notes TEXT,                          -- Notas internas (não visível ao cliente)
  
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

-- Trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE orders IS 'Pedidos realizados no e-commerce';
COMMENT ON COLUMN orders.order_number IS 'Número do pedido visível ao cliente';
COMMENT ON COLUMN orders.asaas_payment_id IS 'ID da cobrança no gateway Asaas';
```

### 8. Tabela: ORDER_ITEMS

**Itens de cada pedido (relação N:N entre orders e products).**

```sql
-- ============================================
-- ORDER_ITEMS (Itens do Pedido)
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← Chave da marca
  
  -- Snapshot do produto no momento da compra (imutável)
  product_name TEXT NOT NULL,                   -- Nome do produto
  variant_name TEXT,                            -- Ex: "Preto / M"
  sku TEXT,                                     -- SKU do produto
  
  -- Valores (congelados no momento da compra)
  price DECIMAL(10,2) NOT NULL,                 -- Preço unitário
  quantity INTEGER NOT NULL,                    -- Quantidade comprada
  subtotal DECIMAL(10,2) NOT NULL,              -- price * quantity
  
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
```

### 9. Tabela: BANNERS

**Banners promocionais na home page.**

```sql
-- ============================================
-- BANNERS (Carrosséis/Promoções)
-- ============================================
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,  -- ← Chave da marca
  
  -- Conteúdo
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,                      -- Imagem desktop
  mobile_image_url TEXT,                        -- Imagem mobile (opcional)
  
  -- CTA (Call to Action)
  cta_text TEXT,                                -- Ex: "Comprar Agora"
  cta_link TEXT,                                -- Ex: "/collections/inverno-2025"
  
  -- Posicionamento
  position INTEGER DEFAULT 0,                   -- Ordem no carrossel
  
  -- Controle
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMP,                         -- Quando o banner fica ativo
  end_date TIMESTAMP,                           -- Quando o banner expira
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_banners_brand ON banners(brand_id);
CREATE INDEX idx_banners_brand_active ON banners(brand_id, active);
CREATE INDEX idx_banners_position ON banners(brand_id, position);

COMMENT ON TABLE banners IS 'Banners promocionais da home page';
```

### 10. Função Helper: update_updated_at_column()

**Trigger function para atualizar automaticamente o campo `updated_at`.**

```sql
-- ============================================
-- HELPER FUNCTION: Atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Atualiza automaticamente campo updated_at ao fazer UPDATE';
```

### 11. Função Helper: generate_order_number()

**Gera número único de pedido automaticamente.**

```sql
-- ============================================
-- HELPER FUNCTION: Gerar Order Number
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  brand_slug TEXT;
  year_part TEXT;
  sequence_part TEXT;
  new_order_number TEXT;
BEGIN
  -- Pegar slug da marca
  SELECT slug INTO brand_slug
  FROM brands
  WHERE id = NEW.brand_id;
  
  -- Ano atual
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Sequência (conta pedidos desta marca neste ano)
  SELECT LPAD(
    (COUNT(*) + 1)::TEXT,
    4,
    '0'
  ) INTO sequence_part
  FROM orders
  WHERE brand_id = NEW.brand_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  -- Montar número do pedido (ex: SESH-2026-0001)
  new_order_number := UPPER(brand_slug) || '-' || year_part || '-' || sequence_part;
  
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

COMMENT ON FUNCTION generate_order_number() IS 'Gera número de pedido no formato MARCA-ANO-SEQUENCIA';
```

---

## 🔒 Row Level Security (RLS)

### Ativar RLS em Todas as Tabelas

```sql
-- ============================================
-- ATIVAR ROW LEVEL SECURITY
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
```

### Políticas de Leitura (SELECT) - Públicas

```sql
-- ============================================
-- POLICIES: SELECT (Leitura Pública)
-- ============================================

-- Brands: todos podem ler marcas ativas
CREATE POLICY "Public can read active brands"
  ON brands FOR SELECT
  USING (active = true);

-- Products: todos podem ler produtos ativos
CREATE POLICY "Public can read active products"
  ON products FOR SELECT
  USING (active = true AND available_for_sale = true);

-- Product Images: públicas
CREATE POLICY "Public can read product images"
  ON product_images FOR SELECT
  USING (true);

-- Product Variants: apenas com estoque
CREATE POLICY "Public can read variants with stock"
  ON product_variants FOR SELECT
  USING (active = true AND stock > 0);

-- Collections: apenas ativas
CREATE POLICY "Public can read active collections"
  ON collections FOR SELECT
  USING (active = true);

-- Collection Products: públicos
CREATE POLICY "Public can read collection products"
  ON collection_products FOR SELECT
  USING (true);

-- Banners: apenas ativos e dentro do período
CREATE POLICY "Public can read active banners"
  ON banners FOR SELECT
  USING (
    active = true
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );
```

### Políticas de Orders (Privadas)

```sql
-- ============================================
-- POLICIES: ORDERS (Acesso Restrito)
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
```

---

## 📦 Seed Data (Dados Iniciais)

### Inserir 3 Marcas Iniciais

```sql
-- ============================================
-- SEED: 3 Marcas Iniciais
-- ============================================

INSERT INTO brands (slug, name, domain, theme, features, settings, asaas_api_key, asaas_environment)
VALUES
  -- Marca A: Sesh Store (Streetwear)
  (
    'sesh',
    'Sesh Store',
    'seshstore.com.br',
    '{
      "primaryColor": "#00FFFF",
      "secondaryColor": "#000000",
      "backgroundColor": "#FFFFFF",
      "textColor": "#1A1A1A",
      "logo": "/logos/sesh.svg",
      "favicon": "/favicons/sesh.ico",
      "font": "Inter"
    }'::jsonb,
    '{
      "installments": true,
      "loyalty": false,
      "giftCards": true,
      "reviews": true
    }'::jsonb,
    '{
      "minOrderValue": 50.00,
      "freeShippingThreshold": 200.00,
      "maxInstallments": 12
    }'::jsonb,
    'SUA_API_KEY_ASAAS_SESH',
    'sandbox'
  ),
  
  -- Marca B: (Exemplo genérico)
  (
    'marcab',
    'Marca B',
    'marcab.com.br',
    '{
      "primaryColor": "#FF0066",
      "secondaryColor": "#1A1A1A",
      "backgroundColor": "#FAFAFA",
      "textColor": "#333333",
      "logo": "/logos/marca-b.svg",
      "favicon": "/favicons/marca-b.ico",
      "font": "Montserrat"
    }'::jsonb,
    '{
      "installments": true,
      "loyalty": true,
      "giftCards": false,
      "reviews": true
    }'::jsonb,
    '{
      "minOrderValue": 80.00,
      "freeShippingThreshold": 300.00,
      "maxInstallments": 10
    }'::jsonb,
    'SUA_API_KEY_ASAAS_MARCA_B',
    'sandbox'
  ),
  
  -- Marca C: (Exemplo genérico)
  (
    'marcac',
    'Marca C',
    'marcac.com.br',
    '{
      "primaryColor": "#00FF00",
      "secondaryColor": "#000000",
      "backgroundColor": "#FFFFFF",
      "textColor": "#2D2D2D",
      "logo": "/logos/marca-c.svg",
      "favicon": "/favicons/marca-c.ico",
      "font": "Poppins"
    }'::jsonb,
    '{
      "installments": false,
      "loyalty": false,
      "giftCards": false,
      "reviews": false
    }'::jsonb,
    '{
      "minOrderValue": 100.00,
      "freeShippingThreshold": 500.00,
      "maxInstallments": 1
    }'::jsonb,
    'SUA_API_KEY_ASAAS_MARCA_C',
    'sandbox'
  );
```

---

## 💻 Código Frontend

### 1. Configuração de Marcas (`src/config/brands.ts`)

```typescript
// ============================================
// CONFIG: BRANDS
// ============================================

export interface BrandTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  logo: string;
  favicon: string;
  font: string;
}

export interface BrandFeatures {
  installments: boolean;
  loyalty: boolean;
  giftCards: boolean;
  reviews: boolean;
}

export interface BrandSettings {
  minOrderValue: number;
  freeShippingThreshold: number;
  maxInstallments: number;
}

export interface Brand {
  slug: string;
  name: string;
  domain: string;
  theme: BrandTheme;
  features: BrandFeatures;
  settings: BrandSettings;
}

export type BrandId = 'sesh' | 'marcaB' | 'marcaC';

// Configuração das marcas (sincronizado com banco de dados)
export const BRANDS: Record<BrandId, Brand> = {
  sesh: {
    slug: 'sesh',
    name: 'Sesh Store',
    domain: 'seshstore.com.br',
    theme: {
      primaryColor: '#00FFFF',
      secondaryColor: '#000000',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A1A',
      logo: '/logos/sesh.svg',
      favicon: '/favicons/sesh.ico',
      font: 'Inter',
    },
    features: {
      installments: true,
      loyalty: false,
      giftCards: true,
      reviews: true,
    },
    settings: {
      minOrderValue: 50,
      freeShippingThreshold: 200,
      maxInstallments: 12,
    },
  },
  
  marcaB: {
    slug: 'marcab',
    name: 'Marca B',
    domain: 'marcab.com.br',
    theme: {
      primaryColor: '#FF0066',
      secondaryColor: '#1A1A1A',
      backgroundColor: '#FAFAFA',
      textColor: '#333333',
      logo: '/logos/marca-b.svg',
      favicon: '/favicons/marca-b.ico',
      font: 'Montserrat',
    },
    features: {
      installments: true,
      loyalty: true,
      giftCards: false,
      reviews: true,
    },
    settings: {
      minOrderValue: 80,
      freeShippingThreshold: 300,
      maxInstallments: 10,
    },
  },
  
  marcaC: {
    slug: 'marcac',
    name: 'Marca C',
    domain: 'marcac.com.br',
    theme: {
      primaryColor: '#00FF00',
      secondaryColor: '#000000',
      backgroundColor: '#FFFFFF',
      textColor: '#2D2D2D',
      logo: '/logos/marca-c.svg',
      favicon: '/favicons/marca-c.ico',
      font: 'Poppins',
    },
    features: {
      installments: false,
      loyalty: false,
      giftCards: false,
      reviews: false,
    },
    settings: {
      minOrderValue: 100,
      freeShippingThreshold: 500,
      maxInstallments: 1,
    },
  },
};

// Helper: pegar domínio sem 'www.'
export function normalizeDomain(domain: string): string {
  return domain.replace(/^www\./, '');
}
```

### 2. Detecção de Marca (`src/lib/brand-detection.ts`)

```typescript
// ============================================
// LIB: BRAND DETECTION
// ============================================

import { BRANDS, BrandId, normalizeDomain } from '@/config/brands';

/**
 * Detecta qual marca está sendo acessada baseado no domínio
 * 
 * Exemplos:
 * - seshstore.com.br → 'sesh'
 * - www.marcab.com.br → 'marcaB'
 * - localhost:5173 → 'sesh' (fallback para dev)
 */
export function detectBrand(): BrandId {
  // Server-side: não tem window
  if (typeof window === 'undefined') {
    return 'sesh'; // Fallback padrão
  }

  const hostname = normalizeDomain(window.location.hostname);

  // Mapeamento domínio → marca
  const domainMap: Record<string, BrandId> = {
    // Produção
    'seshstore.com.br': 'sesh',
    'marcab.com.br': 'marcaB',
    'marcac.com.br': 'marcaC',
    
    // Localhost (desenvolvimento)
    'localhost': 'sesh',
    '127.0.0.1': 'sesh',
    
    // Vercel preview URLs (opcional)
    'sesh-store.vercel.app': 'sesh',
  };

  return domainMap[hostname] || 'sesh';
}

/**
 * Pega configuração da marca atual
 */
export function getCurrentBrand() {
  const brandId = detectBrand();
  return BRANDS[brandId];
}

/**
 * Pega brand_id do Supabase (UUID) baseado no slug
 */
export async function getBrandId(brandSlug: BrandId): Promise<string> {
  const { supabase } = await import('./supabase');
  
  const { data, error } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', brandSlug)
    .single();

  if (error || !data) {
    throw new Error(`Brand ${brandSlug} not found in database`);
  }

  return data.id;
}
```

### 3. Brand Context (`src/contexts/BrandContext.tsx`)

```typescript
// ============================================
// CONTEXT: BRAND
// ============================================

import { createContext, useContext, ReactNode } from 'react';
import { BrandId, Brand } from '@/config/brands';
import { detectBrand, getCurrentBrand } from '@/lib/brand-detection';

interface BrandContextType {
  brandId: BrandId;
  brand: Brand;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const brandId = detectBrand();
  const brand = getCurrentBrand();

  return (
    <BrandContext.Provider value={{ brandId, brand }}>
      {children}
    </BrandContext.Provider>
  );
}

/**
 * Hook para acessar a marca atual
 * 
 * Uso:
 * const { brand, brandId } = useBrand();
 * console.log(brand.name); // "Sesh Store"
 * console.log(brand.theme.primaryColor); // "#00FFFF"
 */
export function useBrand() {
  const context = useContext(BrandContext);
  
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  
  return context;
}
```

### 4. Hook de Produtos (`src/hooks/useProducts.ts`)

```typescript
// ============================================
// HOOK: useProducts (com filtro brand_id)
// ============================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useBrand } from '@/contexts/BrandContext';
import { getBrandId } from '@/lib/brand-detection';

export interface Product {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category: string;
  tags: string[];
  active: boolean;
  featured: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  color: string;
  color_hex: string;
  size: string;
  sku: string;
  stock: number;
}

/**
 * Hook para buscar produtos da marca atual
 * 
 * Uso:
 * const { data: products, isLoading } = useProducts();
 */
export function useProducts() {
  const { brandId } = useBrand();

  return useQuery({
    queryKey: ['products', brandId],
    queryFn: async () => {
      // 1. Pegar brand_id (UUID) do Supabase
      const brandUuid = await getBrandId(brandId);

      // 2. Buscar produtos desta marca
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(id, url, alt_text, position),
          variants:product_variants(id, color, color_hex, size, sku, stock)
        `)
        .eq('brand_id', brandUuid)  // ← FILTRO AUTOMÁTICO
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as Product[];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

/**
 * Hook para buscar produtos por categoria
 */
export function useProductsByCategory(category: string) {
  const { brandId } = useBrand();

  return useQuery({
    queryKey: ['products', brandId, 'category', category],
    queryFn: async () => {
      const brandUuid = await getBrandId(brandId);

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(id, url, alt_text, position),
          variants:product_variants(id, color, color_hex, size, sku, stock)
        `)
        .eq('brand_id', brandUuid)
        .eq('category', category)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as Product[];
    },
  });
}

/**
 * Hook para buscar 1 produto específico
 */
export function useProduct(slug: string) {
  const { brandId } = useBrand();

  return useQuery({
    queryKey: ['product', brandId, slug],
    queryFn: async () => {
      const brandUuid = await getBrandId(brandId);

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(id, url, alt_text, position),
          variants:product_variants(id, color, color_hex, size, sku, stock)
        `)
        .eq('brand_id', brandUuid)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      return data as Product;
    },
  });
}
```

### 5. Modificar App.tsx

```typescript
// ============================================
// APP.TSX (Modificar)
// ============================================

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { BrandProvider, useBrand } from './contexts/BrandContext';
import Router from './Router'; // Suas rotas existentes

function AppContent() {
  const { brand } = useBrand();

  useEffect(() => {
    // Aplicar tema da marca dinamicamente
    const root = document.documentElement;
    
    root.style.setProperty('--color-primary', brand.theme.primaryColor);
    root.style.setProperty('--color-secondary', brand.theme.secondaryColor);
    root.style.setProperty('--color-background', brand.theme.backgroundColor);
    root.style.setProperty('--color-text', brand.theme.textColor);

    // Atualizar title da página
    document.title = brand.name;

    // Trocar favicon
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = brand.theme.favicon;
    }

    // Aplicar font family
    root.style.fontFamily = brand.theme.font;
  }, [brand]);

  return <Router />;
}

export default function App() {
  return (
    <BrandProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </BrandProvider>
  );
}
```

---

## 💳 Integração Asaas

### 1. Cliente Asaas (`src/lib/asaas.ts`)

```typescript
// ============================================
// LIB: ASAAS CLIENT
// ============================================

import { useBrand } from '@/contexts/BrandContext';

const ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3'; // Sandbox
// const ASAAS_BASE_URL = 'https://api.asaas.com/v3'; // Produção

export interface AsaasCustomer {
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  mobilePhone: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  postalCode: string;
}

export interface AsaasPayment {
  customer: string; // ID do cliente no Asaas
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  installmentCount?: number;
  installmentValue?: number;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
}

/**
 * Cliente HTTP para API do Asaas
 */
class AsaasClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${ASAAS_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.description || 'Asaas API error');
    }

    return response.json();
  }

  /**
   * Criar cliente no Asaas
   */
  async createCustomer(data: AsaasCustomer) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Criar cobrança (boleto, PIX ou cartão)
   */
  async createPayment(data: AsaasPayment) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Consultar status de pagamento
   */
  async getPayment(paymentId: string) {
    return this.request(`/payments/${paymentId}`, {
      method: 'GET',
    });
  }

  /**
   * Gerar QR Code PIX
   */
  async getPixQrCode(paymentId: string) {
    return this.request(`/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
    });
  }
}

/**
 * Hook para usar Asaas com API key da marca atual
 */
export function useAsaas() {
  const { brand } = useBrand();
  
  // TODO: Buscar asaas_api_key do Supabase (da tabela brands)
  const apiKey = import.meta.env.VITE_ASAAS_API_KEY || 'API_KEY_PLACEHOLDER';
  
  return new AsaasClient(apiKey);
}
```

### 2. Hook de Checkout com Asaas (`src/hooks/useCheckout.ts`)

```typescript
// ============================================
// HOOK: useCheckout (Integração Asaas)
// ============================================

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAsaas } from '@/lib/asaas';
import { useBrand } from '@/contexts/BrandContext';
import { getBrandId } from '@/lib/brand-detection';

export interface CheckoutData {
  // Cliente
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  
  // Endereço
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  
  // Pagamento
  paymentMethod: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  installments?: number;
  
  // Cartão (se método = CREDIT_CARD)
  cardHolderName?: string;
  cardNumber?: string;
  cardExpiry?: string; // MM/YY
  cardCvv?: string;
  
  // Carrinho
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shippingCost: number;
  total: number;
}

export function useCheckout() {
  const { brandId } = useBrand();
  const asaas = useAsaas();

  return useMutation({
    mutationFn: async (data: CheckoutData) => {
      // 1. Pegar brand_id (UUID)
      const brandUuid = await getBrandId(brandId);

      // 2. Criar cliente no Asaas
      const asaasCustomer = await asaas.createCustomer({
        name: data.customerName,
        cpfCnpj: data.customerCpf,
        email: data.customerEmail,
        phone: data.customerPhone,
        mobilePhone: data.customerPhone,
        address: data.rua,
        addressNumber: data.numero,
        complement: data.complemento,
        province: data.bairro,
        postalCode: data.cep,
      });

      // 3. Criar cobrança no Asaas
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // Vencimento em 3 dias

      const paymentData: any = {
        customer: asaasCustomer.id,
        billingType: data.paymentMethod,
        value: data.total,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Pedido ${brandId.toUpperCase()}`,
      };

      // Se for cartão, adicionar dados
      if (data.paymentMethod === 'CREDIT_CARD' && data.cardNumber) {
        const [expiryMonth, expiryYear] = data.cardExpiry!.split('/');
        
        paymentData.installmentCount = data.installments || 1;
        paymentData.creditCard = {
          holderName: data.cardHolderName,
          number: data.cardNumber.replace(/\s/g, ''),
          expiryMonth,
          expiryYear: `20${expiryYear}`,
          ccv: data.cardCvv,
        };
        paymentData.creditCardHolderInfo = {
          name: data.customerName,
          email: data.customerEmail,
          cpfCnpj: data.customerCpf,
          postalCode: data.cep,
          addressNumber: data.numero,
          phone: data.customerPhone,
        };
      }

      const asaasPayment = await asaas.createPayment(paymentData);

      // 4. Criar pedido no Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          brand_id: brandUuid,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone,
          customer_cpf: data.customerCpf,
          shipping_address: {
            cep: data.cep,
            rua: data.rua,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.cidade,
            estado: data.estado,
          },
          subtotal: data.subtotal,
          shipping_cost: data.shippingCost,
          total: data.total,
          payment_method: data.paymentMethod.toLowerCase(),
          installments: data.installments || 1,
          asaas_payment_id: asaasPayment.id,
          asaas_invoice_url: asaasPayment.invoiceUrl || asaasPayment.bankSlipUrl,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 5. Criar order_items
      const orderItems = data.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        variant_id: item.variantId,
        brand_id: brandUuid,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        // TODO: Adicionar product_name, variant_name, sku (buscar do DB)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 6. Retornar dados do pedido + Asaas
      return {
        order,
        asaasPayment,
      };
    },
  });
}
```

---

## 📝 Variáveis de Ambiente

### Arquivo: `.env.local.example`

```bash
# ============================================
# SUPABASE
# ============================================
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui

# ============================================
# ASAAS (Gateway de Pagamento)
# ============================================
# Sandbox (desenvolvimento)
VITE_ASAAS_API_KEY=sua-api-key-sandbox-asaas
VITE_ASAAS_ENVIRONMENT=sandbox

# Produção (quando for ao ar)
# VITE_ASAAS_API_KEY=sua-api-key-producao-asaas
# VITE_ASAAS_ENVIRONMENT=production

# ============================================
# OPCIONAL: Outras APIs
# ============================================
# API de Frete (ViaCEP, Melhor Envio, etc)
# VITE_MELHOR_ENVIO_TOKEN=seu-token-aqui
```

---

## 📦 Dependências a Remover/Adicionar

### Remover (Stripe)

```bash
npm uninstall @stripe/stripe-js @stripe/react-stripe-js
```

### Adicionar (se ainda não tiver)

```bash
# Já instaladas conforme TECH_STACK_ANALYSIS.md
# Apenas confirmar que estão instaladas:

npm list @supabase/supabase-js
npm list @tanstack/react-query
npm list zustand
npm list react-hook-form
npm list zod
npm list @hookform/resolvers
```

---

## 🚀 Checklist de Implementação

### Fase 1: Database (2-3 dias)

- [ ] Executar SQL completo no Supabase SQL Editor
- [ ] Verificar que todas as tabelas foram criadas
- [ ] Executar seed data (inserir 3 marcas)
- [ ] Testar RLS policies (tentar acessar dados de outra marca)
- [ ] Configurar Supabase Storage para imagens de produtos

### Fase 2: Frontend Core (3-4 dias)

- [ ] Criar `src/config/brands.ts`
- [ ] Criar `src/lib/brand-detection.ts`
- [ ] Criar `src/contexts/BrandContext.tsx`
- [ ] Modificar `App.tsx` (adicionar BrandProvider + tema dinâmico)
- [ ] Testar detecção de marca no localhost

### Fase 3: Hooks (2-3 dias)

- [ ] Modificar `useProducts.ts` (adicionar filtro `brand_id`)
- [ ] Criar `useCollections.ts` (com filtro `brand_id`)
- [ ] Criar `useOrders.ts` (com filtro `brand_id`)
- [ ] Criar `useBrand.ts` (hook do contexto)
- [ ] Testar queries no console (verificar se filtra corretamente)

### Fase 4: Asaas Integration (3-4 dias)

- [ ] Criar conta no Asaas Sandbox
- [ ] Pegar API Keys de cada marca
- [ ] Criar `src/lib/asaas.ts`
- [ ] Criar `src/types/asaas.ts`
- [ ] Criar `src/hooks/useAsaas.ts`
- [ ] Criar `src/hooks/useCheckout.ts`
- [ ] Testar pagamento com cartão fake (sandbox)
- [ ] Testar geração de boleto
- [ ] Testar geração de PIX QR Code

### Fase 5: UI Adjustments (2-3 dias)

- [ ] Atualizar componentes para usar `useBrand()`
- [ ] Esconder/mostrar features baseado em `brand.features`
- [ ] Ajustar formulário de checkout para Asaas
- [ ] Página de sucesso do pedido (mostrar boleto/PIX)
- [ ] Aplicar cores/logo dinamicamente

### Fase 6: Deploy & Domains (1-2 dias)

- [ ] Deploy no Vercel
- [ ] Adicionar 3 domínios no Vercel
- [ ] Configurar DNS (CNAME records)
- [ ] Testar cada domínio (verificar se renderiza marca correta)
- [ ] Configurar variáveis de ambiente no Vercel
- [ ] Trocar Asaas de sandbox → production

### Fase 7: Testes (2-3 dias)

- [ ] Teste E2E: fluxo completo de compra (Marca A)
- [ ] Teste E2E: fluxo completo de compra (Marca B)
- [ ] Teste E2E: fluxo completo de compra (Marca C)
- [ ] Verificar isolamento de dados (RLS)
- [ ] Teste de pagamento real (valores pequenos)
- [ ] Teste de webhooks Asaas

---

## 🎯 Resultado Final Esperado

Após implementar tudo acima:

```
✅ 1 código base servindo 3 domínios
✅ Cada domínio renderiza marca diferente (logo/cores/features)
✅ Dados isolados por marca (brand_id + RLS)
✅ Checkout integrado com Asaas
✅ Admin pode gerenciar 3 marcas de 1 lugar
✅ Escala infinitamente (adicionar marca 4 = 1 dia)
```

---

## 📚 Recursos Úteis

### Documentação Oficial

- **Asaas Docs:** https://docs.asaas.com/reference
- **Supabase Docs:** https://supabase.com/docs
- **React Query:** https://tanstack.com/query/latest
- **Zustand:** https://github.com/pmndrs/zustand

### Endpoints Asaas Importantes

```
POST /v3/customers                # Criar cliente
POST /v3/payments                 # Criar cobrança
GET  /v3/payments/{id}            # Consultar pagamento
GET  /v3/payments/{id}/pixQrCode  # QR Code PIX
```

### Tipos de Cobrança Asaas

- `BOLETO` - Boleto bancário (vencimento 3+ dias)
- `PIX` - PIX (expiração configurável)
- `CREDIT_CARD` - Cartão de crédito (até 12x)

---

## ⚠️ Avisos Importantes

1. **API Keys Asaas:** Cada marca deve ter sua própria API Key (ou usar subcontas)
2. **Sandbox vs Produção:** Sempre testar em sandbox antes de ir para produção
3. **RLS:** NUNCA desabilitar Row Level Security em produção
4. **Webhooks:** Configurar webhooks do Asaas para atualizar status de pagamento automaticamente
5. **Imagens:** Usar Supabase Storage, não URLs externas hardcoded
6. **SEO:** Adicionar meta tags diferentes por marca (Open Graph, etc)

---

## 🐛 Troubleshooting

### Problema: "Brand not found"
- Verificar se executou o seed SQL
- Verificar se o domínio está no mapa de `brand-detection.ts`

### Problema: Queries retornam dados de outra marca
- Verificar se RLS policies estão ativas
- Verificar se está passando `brand_id` corretamente

### Problema: Asaas retorna erro 401
- Verificar se API Key está correta
- Verificar se está usando sandbox URL para chave sandbox

### Problema: Temas não aplicam
- Verificar console do navegador (erros de CSS)
- Verificar se `BrandProvider` está envolvendo o app
- Verificar se `useEffect` no App.tsx está rodando

---

**FIM DO DOCUMENTO**

Este documento contém TUDO que o Claude Code precisa para implementar o sistema multi-tenant com Asaas. Execute passo a passo seguindo o checklist!
