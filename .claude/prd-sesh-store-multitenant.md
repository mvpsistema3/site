# PRD - Sesh Store Multitenant E-commerce

## Documento de Requisitos do Produto

**Versão:** 1.0  
**Data:** 29 de Janeiro de 2026  
**Projeto:** Migração de arquitetura 5S Brand → Sesh Store Multitenant

---

## 1. CONTEXTO E OBJETIVO

### 1.1 Situação Atual

Você possui dois projetos:

1. **5S Brand** (Projeto de Referência)
   - E-commerce single-tenant maduro e funcional
   - Arquitetura bem definida com camada de Services
   - Views otimizadas no PostgreSQL (v_plp, v_pdp)
   - Sistema de ordenação robusto
   - Integração completa com Supabase

2. **Sesh Store** (Projeto Alvo)
   - E-commerce multitenant para 3 marcas
   - Frontend funcional com React + TypeScript
   - Sistema de temas dinâmicos implementado
   - Carrinho e checkout básicos funcionando
   - Banco de dados iniciado mas incompleto

### 1.2 Objetivo

Adaptar os padrões de sucesso do 5S Brand para o Sesh Store, criando uma arquitetura multitenant escalável que:

- Mantenha a separação clara de responsabilidades (Services Layer)
- Implemente Views otimizadas para performance
- Suporte 3+ marcas com dados segregados
- Preserve a flexibilidade de ordenação e filtros
- Mantenha código limpo e manutenível

### 1.3 Decisões Arquiteturais Abertas

Este PRD **não define** tecnologias específicas de forma rígida. O Claude Code com acesso ao projeto deve decidir:

- Se mantém React ou migra para outro framework
- Quais bibliotecas de estado usar (Zustand já instalado)
- Estrutura exata de pastas
- Padrões de nomenclatura

O PRD define **o que** deve existir, não **como** implementar cada detalhe.

---

## 2. ARQUITETURA MULTITENANT

### 2.1 Estratégia Recomendada: RLS com `brand_id`

Baseado na análise do 5S Brand, a melhor estratégia para 3 marcas em um único Supabase é **Row Level Security com campo `brand_id`**.

#### Justificativa:
- Custo menor (1 projeto Supabase vs 3)
- Dados centralizados facilitam analytics
- Possibilidade futura de compartilhar produtos entre marcas
- Código único para todas as marcas

#### Estrutura da Tabela `brands`:

```sql
-- Tabela mestre de marcas
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,          -- 'sesh-store', 'grupo-got', 'the-og'
  name TEXT NOT NULL,                 -- 'Sesh Store', 'Grupo GOT', 'The OG'
  domain TEXT,                        -- Domínio customizado (futuro)
  
  -- Configurações de tema (sincronizado com frontend)
  theme JSONB NOT NULL DEFAULT '{}',  
  -- Exemplo: { "primaryColor": "#41BAC2", "logo": "url", "font": "Inter" }
  
  -- Features habilitadas por marca
  features JSONB NOT NULL DEFAULT '{}',
  -- Exemplo: { "loyalty": true, "reviews": true, "giftCards": false }
  
  -- Configurações de negócio
  settings JSONB NOT NULL DEFAULT '{}',
  -- Exemplo: { "minOrderValue": 50, "maxInstallments": 12, "freeShippingThreshold": 200 }
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir as 3 marcas
INSERT INTO brands (slug, name, theme, features, settings) VALUES
('sesh-store', 'Sesh Store', 
  '{"primaryColor": "#41BAC2", "secondaryColor": "#1a1a1a"}',
  '{"loyalty": true, "reviews": true, "giftCards": true, "installments": true}',
  '{"minOrderValue": 0, "maxInstallments": 12, "freeShippingThreshold": 200}'
),
('grupo-got', 'Grupo GOT',
  '{"primaryColor": "#000000", "secondaryColor": "#333333"}',
  '{"loyalty": false, "reviews": true, "giftCards": false, "installments": true}',
  '{"minOrderValue": 100, "maxInstallments": 6, "freeShippingThreshold": 300}'
),
('the-og', 'The OG',
  '{"primaryColor": "#6A226C", "secondaryColor": "#1a1a1a"}',
  '{"loyalty": true, "reviews": true, "giftCards": true, "installments": true}',
  '{"minOrderValue": 0, "maxInstallments": 10, "freeShippingThreshold": 250}'
);
```

### 2.2 Função de Contexto de Marca

```sql
-- Função para setar contexto da marca atual
CREATE OR REPLACE FUNCTION set_brand_context(p_brand_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_brand_id', p_brand_id::text, false);
END;
$$;

-- Função helper para obter brand_id atual
CREATE OR REPLACE FUNCTION current_brand_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_brand_id', true), '')::UUID;
$$;
```

### 2.3 Aplicação de RLS em Todas as Tabelas

Toda tabela que contém dados específicos de marca DEVE:

1. Ter coluna `brand_id UUID NOT NULL REFERENCES brands(id)`
2. Ter RLS habilitado
3. Ter policy filtrando por `current_brand_id()`

**Exemplo de policy padrão:**

```sql
-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy de leitura pública filtrada por marca
CREATE POLICY "brand_isolation_select" ON products
  FOR SELECT
  USING (brand_id = current_brand_id());

-- Policy de escrita para admins (futuro)
CREATE POLICY "brand_isolation_insert" ON products
  FOR INSERT
  WITH CHECK (brand_id = current_brand_id());
```

---

## 3. ESTRUTURA DO BANCO DE DADOS

### 3.1 Tabelas Core (Adaptar do 5S Brand)

Todas as tabelas abaixo devem incluir `brand_id` e RLS:

#### 3.1.1 Produtos e Variantes

```sql
-- Produtos principais
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,                       -- HTML ou texto
  base_price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),         -- Preço "De:" (desconto)
  
  category_id UUID REFERENCES categories(id),
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',           -- 'active' | 'draft' | 'archived'
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Ordenação manual (melhoria sobre 5S Brand)
  display_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Slug único por marca
  CONSTRAINT unique_product_slug_per_brand UNIQUE(brand_id, slug)
);

-- Índices
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_slug ON products(brand_id, slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured);


-- Variantes (cor + tamanho)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  sku TEXT,
  
  price DECIMAL(10,2),                    -- Preço específico (opcional)
  compare_at_price DECIMAL(10,2),
  
  stock INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,    -- Reserva de carrinho
  
  image_url TEXT,                         -- Imagem específica da variante
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_variant UNIQUE(product_id, color, size)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);


-- Imagens do produto
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_product ON product_images(product_id);
```

#### 3.1.2 Categorias

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  parent_id UUID REFERENCES categories(id),  -- Subcategorias
  display_order INTEGER NOT NULL,
  
  status TEXT DEFAULT 'active',
  image_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_category_slug_per_brand UNIQUE(brand_id, slug)
);

CREATE INDEX idx_categories_brand ON categories(brand_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

#### 3.1.3 Coleções

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  status TEXT DEFAULT 'active',
  start_date TIMESTAMPTZ,                 -- Coleção temporal
  end_date TIMESTAMPTZ,
  
  -- Hero Carousel
  image_url TEXT,
  desktop_image_url TEXT,
  mobile_image_url TEXT,
  sort_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_collection_slug_per_brand UNIQUE(brand_id, slug)
);

CREATE INDEX idx_collections_brand ON collections(brand_id);


-- Relação N:N produtos <-> coleções
CREATE TABLE product_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  
  display_order INTEGER,                  -- Ordem do produto na coleção
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_product_collection UNIQUE(product_id, collection_id)
);
```

#### 3.1.4 Banners da Home

```sql
CREATE TABLE home_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  title VARCHAR(100) NOT NULL,
  subtitle VARCHAR(200),
  button_text VARCHAR(50) DEFAULT 'EXPLORAR',
  
  image_url TEXT NOT NULL,
  desktop_image_url TEXT,                 -- Imagem desktop (opcional)
  mobile_image_url TEXT,                  -- Imagem mobile (opcional)
  
  link_url VARCHAR(500) DEFAULT '/produtos',
  
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banners_brand ON home_banners(brand_id);
```

#### 3.1.5 Configurações e Conteúdo Institucional

```sql
-- Configurações globais da loja (1 registro por marca)
CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID UNIQUE NOT NULL REFERENCES brands(id),
  
  company_name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  
  address JSONB,                          -- Endereço completo
  social_media JSONB,                     -- URLs das redes sociais
  
  tax_id TEXT,                            -- CNPJ
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Nossa História / Sobre (1 registro por marca)
CREATE TABLE company_story (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID UNIQUE NOT NULL REFERENCES brands(id),
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,                  -- HTML ou texto
  
  -- Seções adicionais (missão, valores)
  mission TEXT,
  values JSONB,                           -- Array de valores
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Seção "Nossa Essência" da home
CREATE TABLE essence_section (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID UNIQUE NOT NULL REFERENCES brands(id),
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- FAQ
CREATE TABLE faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_faq_brand ON faq_items(brand_id);


-- Mensagens de contato
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  
  status TEXT DEFAULT 'pending',          -- 'pending' | 'read' | 'replied'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_brand ON contact_messages(brand_id);
```

#### 3.1.6 Páginas Estáticas e Footer (NOVO - não existia no 5S Brand)

```sql
-- Páginas estáticas dinâmicas
CREATE TABLE static_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,                  -- HTML ou texto
  
  meta_title TEXT,
  meta_description TEXT,
  
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_page_slug_per_brand UNIQUE(brand_id, slug)
);

CREATE INDEX idx_static_pages_brand ON static_pages(brand_id);


-- Links do rodapé
CREATE TABLE footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  section TEXT NOT NULL,                  -- "Institucional", "Atendimento"
  label TEXT NOT NULL,
  
  link_type TEXT NOT NULL,                -- 'static_page' | 'internal' | 'external'
  reference_id UUID REFERENCES static_pages(id),
  url TEXT,
  
  target TEXT DEFAULT '_self',
  
  sort_order INTEGER NOT NULL,
  section_order INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_footer_brand ON footer_links(brand_id);
```

#### 3.1.7 Produtos Relacionados (NOVO - não existia no 5S Brand)

```sql
-- "Complete o Look" / Produtos relacionados
CREATE TABLE product_looks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  display_order INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_product_look UNIQUE(product_id, related_product_id),
  CONSTRAINT no_self_reference CHECK (product_id != related_product_id)
);

CREATE INDEX idx_looks_product ON product_looks(product_id);
```

### 3.2 Tabelas de Pedidos e Carrinho

```sql
-- Carrinhos
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,                        -- Para usuários não logados
  
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carts_brand ON carts(brand_id);
CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);


-- Itens do carrinho
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Snapshot do preço no momento da adição
  unit_price DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);


-- Pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  
  user_id UUID REFERENCES auth.users(id),
  order_number TEXT UNIQUE NOT NULL,
  
  status TEXT DEFAULT 'pending',          -- 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  
  -- Valores
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Endereço de entrega (snapshot)
  shipping_address JSONB NOT NULL,
  
  -- Dados do cliente (snapshot)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_document TEXT,                 -- CPF
  
  -- Pagamento
  payment_method TEXT,                    -- 'credit_card' | 'pix' | 'boleto'
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,                        -- ID externo (Stripe, Asaas, etc)
  
  -- Rastreamento
  tracking_code TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_brand ON orders(brand_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);


-- Itens do pedido
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  variant_id UUID REFERENCES product_variants(id),
  
  -- Snapshot do produto no momento da compra
  product_name TEXT NOT NULL,
  variant_color TEXT NOT NULL,
  variant_size TEXT NOT NULL,
  sku TEXT,
  
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### 3.3 Tabelas de Usuários

```sql
-- Perfis de usuário (extensão do auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  full_name TEXT,
  phone TEXT,
  document TEXT,                          -- CPF
  birth_date DATE,
  
  -- Marca preferida do usuário (opcional)
  preferred_brand_id UUID REFERENCES brands(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Endereços do cliente
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  label TEXT,                             -- "Casa", "Trabalho"
  
  zip_code TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON customer_addresses(user_id);


-- Lista de desejos
CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_wishlist_item UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON wishlist(user_id);
```

---

## 4. VIEWS OTIMIZADAS

### 4.1 View `v_plp` (Product Listing Page)

```sql
CREATE OR REPLACE VIEW v_plp WITH (security_invoker = true) AS
SELECT
  p.id,
  p.brand_id,
  p.slug,
  p.name,
  p.description,
  p.base_price,
  p.compare_at_price,
  p.featured,
  p.status,
  p.display_order,
  p.created_at,
  
  -- Categoria
  c.id AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.display_order AS category_display_order,
  
  -- Imagem principal
  (SELECT url FROM product_images pi
   WHERE pi.product_id = p.id
   ORDER BY pi.display_order ASC
   LIMIT 1) AS main_image,
  
  -- Segunda imagem (hover)
  (SELECT url FROM product_images pi
   WHERE pi.product_id = p.id
   ORDER BY pi.display_order ASC
   OFFSET 1 LIMIT 1) AS hover_image,
  
  -- Menor preço efetivo
  COALESCE(
    (SELECT MIN(COALESCE(pv.price, p.base_price))
     FROM product_variants pv
     WHERE pv.product_id = p.id AND pv.stock > 0),
    p.base_price
  ) AS min_effective_price,
  
  -- Maior desconto %
  (SELECT MAX(
    CASE WHEN pv.compare_at_price > 0 AND pv.compare_at_price > COALESCE(pv.price, p.base_price)
    THEN ROUND(((pv.compare_at_price - COALESCE(pv.price, p.base_price)) / pv.compare_at_price) * 100)
    ELSE 0 END
  ) FROM product_variants pv WHERE pv.product_id = p.id) AS max_discount_percent,
  
  -- Tem promoção?
  EXISTS(
    SELECT 1 FROM product_variants pv
    WHERE pv.product_id = p.id
    AND pv.compare_at_price > COALESCE(pv.price, p.base_price)
  ) AS has_promo,
  
  -- Cores disponíveis
  (SELECT ARRAY_AGG(DISTINCT pv.color ORDER BY pv.color)
   FROM product_variants pv
   WHERE pv.product_id = p.id AND pv.stock > 0) AS available_colors,
  
  -- Tamanhos disponíveis
  (SELECT ARRAY_AGG(DISTINCT pv.size)
   FROM product_variants pv
   WHERE pv.product_id = p.id AND pv.stock > 0) AS available_sizes,
  
  -- Slugs de coleções
  (SELECT ARRAY_AGG(col.slug)
   FROM product_collections pc
   JOIN collections col ON col.id = pc.collection_id
   WHERE pc.product_id = p.id
   AND col.status = 'active'
   AND (col.start_date IS NULL OR col.start_date <= NOW())
   AND (col.end_date IS NULL OR col.end_date >= NOW())
  ) AS collection_slugs,
  
  -- Estoque total
  (SELECT COALESCE(SUM(pv.stock), 0)
   FROM product_variants pv
   WHERE pv.product_id = p.id) AS total_stock,
  
  -- É novo? (criado nos últimos 30 dias)
  (p.created_at > NOW() - INTERVAL '30 days') AS is_new

FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active';
```

### 4.2 View `v_pdp` (Product Detail Page)

```sql
CREATE OR REPLACE VIEW v_pdp WITH (security_invoker = true) AS
SELECT
  p.*,
  c.name AS category_name,
  c.slug AS category_slug,
  
  -- Array de imagens ordenado
  (SELECT COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', pi.id,
      'url', pi.url,
      'alt_text', pi.alt_text,
      'display_order', pi.display_order
    ) ORDER BY pi.display_order
  ), '[]'::json) FROM product_images pi
  WHERE pi.product_id = p.id) AS images,
  
  -- Array de variantes com estoque
  (SELECT COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT(
      'id', pv.id,
      'color', pv.color,
      'size', pv.size,
      'sku', pv.sku,
      'price', pv.price,
      'compare_at_price', pv.compare_at_price,
      'effective_price', COALESCE(pv.price, p.base_price),
      'has_promo', (pv.compare_at_price > COALESCE(pv.price, p.base_price)),
      'discount_percent', CASE 
        WHEN pv.compare_at_price > COALESCE(pv.price, p.base_price)
        THEN ROUND(((pv.compare_at_price - COALESCE(pv.price, p.base_price)) / pv.compare_at_price) * 100)
        ELSE 0 END,
      'image_url', pv.image_url,
      'stock', pv.stock,
      'in_stock', (pv.stock > 0)
    )
  ), '[]'::json) FROM product_variants pv
  WHERE pv.product_id = p.id) AS variants,
  
  -- Cores únicas disponíveis
  (SELECT ARRAY_AGG(DISTINCT pv.color ORDER BY pv.color)
   FROM product_variants pv
   WHERE pv.product_id = p.id) AS colors,
  
  -- Tamanhos únicos disponíveis
  (SELECT ARRAY_AGG(DISTINCT pv.size)
   FROM product_variants pv
   WHERE pv.product_id = p.id) AS sizes

FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.status = 'active';
```

---

## 5. FUNÇÕES RPC

### 5.1 Navegação

```sql
-- Categorias ativas com contagem de produtos
CREATE OR REPLACE FUNCTION get_active_categories_with_products(p_brand_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  product_count BIGINT,
  display_order INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    c.id,
    c.name,
    c.slug,
    COUNT(p.id) AS product_count,
    c.display_order
  FROM categories c
  INNER JOIN products p ON p.category_id = c.id
  WHERE c.brand_id = p_brand_id
  AND c.status = 'active'
  AND p.status = 'active'
  GROUP BY c.id, c.name, c.slug, c.display_order
  HAVING COUNT(p.id) > 0
  ORDER BY c.display_order ASC;
$$;


-- Coleções ativas com contagem de produtos
CREATE OR REPLACE FUNCTION get_active_collections_with_products(p_brand_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  product_count BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    col.id,
    col.name,
    col.slug,
    COUNT(DISTINCT pc.product_id) AS product_count
  FROM collections col
  INNER JOIN product_collections pc ON pc.collection_id = col.id
  INNER JOIN products p ON p.id = pc.product_id
  WHERE col.brand_id = p_brand_id
  AND col.status = 'active'
  AND p.status = 'active'
  AND (col.start_date IS NULL OR col.start_date <= NOW())
  AND (col.end_date IS NULL OR col.end_date >= NOW())
  GROUP BY col.id, col.name, col.slug
  HAVING COUNT(DISTINCT pc.product_id) > 0
  ORDER BY col.created_at DESC;
$$;
```

### 5.2 Identificação de Marca

```sql
-- Buscar marca por slug
CREATE OR REPLACE FUNCTION get_brand_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  name TEXT,
  theme JSONB,
  features JSONB,
  settings JSONB
)
LANGUAGE SQL
STABLE
AS $$
  SELECT id, slug, name, theme, features, settings
  FROM brands
  WHERE slug = p_slug AND is_active = true
  LIMIT 1;
$$;
```

---

## 6. CAMADA DE SERVICES (FRONTEND)

### 6.1 Estrutura Recomendada

```
src/
├── services/
│   ├── index.ts              # Re-exports
│   ├── brand.ts              # Detecção e contexto de marca
│   ├── products.ts           # getPLP, getPDP, getProductLooks
│   ├── categories.ts         # Categorias e coleções
│   ├── banners.ts            # Banners da home
│   ├── content.ts            # Páginas estáticas, FAQ, história
│   ├── cart.ts               # Carrinho
│   ├── orders.ts             # Pedidos
│   ├── auth.ts               # Autenticação
│   └── settings.ts           # Configurações da loja
```

### 6.2 Service Pattern (Referência)

O Claude Code deve criar services seguindo este padrão:

```typescript
// Exemplo: services/products.ts

import { supabase } from '@/lib/supabase';
import { getCurrentBrandId } from './brand';

export interface PLPProduct {
  id: string;
  slug: string;
  name: string;
  main_image: string | null;
  hover_image: string | null;
  base_price: number;
  compare_at_price: number | null;
  min_effective_price: number;
  max_discount_percent: number;
  has_promo: boolean;
  available_colors: string[];
  available_sizes: string[];
  category_name: string;
  category_slug: string;
  collection_slugs: string[];
  featured: boolean;
  is_new: boolean;
  total_stock: number;
}

export interface PLPFilters {
  category_slug?: string;
  collection_slug?: string;
  q?: string;
  colors?: string[];
  sizes?: string[];
  price_min?: number;
  price_max?: number;
  featured?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

export async function getPLP(filters: PLPFilters = {}): Promise<{
  items: PLPProduct[];
  total: number;
  hasMore: boolean;
}> {
  const brandId = getCurrentBrandId();
  const { page = 1, limit = 12, sort = 'relevance', ...rest } = filters;
  
  // Setar contexto da marca para RLS
  await supabase.rpc('set_brand_context', { p_brand_id: brandId });
  
  let query = supabase
    .from('v_plp')
    .select('*', { count: 'exact' });
  
  // Aplicar filtros...
  if (rest.category_slug) {
    query = query.eq('category_slug', rest.category_slug);
  }
  
  if (rest.collection_slug) {
    query = query.contains('collection_slugs', [rest.collection_slug]);
  }
  
  if (rest.q) {
    query = query.ilike('name', `%${rest.q}%`);
  }
  
  if (rest.colors?.length) {
    query = query.overlaps('available_colors', rest.colors);
  }
  
  if (rest.sizes?.length) {
    query = query.overlaps('available_sizes', rest.sizes);
  }
  
  if (rest.price_min !== undefined) {
    query = query.gte('min_effective_price', rest.price_min);
  }
  
  if (rest.price_max !== undefined) {
    query = query.lte('min_effective_price', rest.price_max);
  }
  
  if (rest.featured) {
    query = query.eq('featured', true);
  }
  
  // Aplicar ordenação
  switch (sort) {
    case 'price_asc':
      query = query.order('min_effective_price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('min_effective_price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    default: // relevance
      query = query
        .order('featured', { ascending: false })
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('category_display_order', { ascending: true })
        .order('created_at', { ascending: false });
  }
  
  // Paginação
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);
  
  const { data, count, error } = await query;
  
  if (error) throw error;
  
  return {
    items: data || [],
    total: count || 0,
    hasMore: (count || 0) > page * limit
  };
}
```

### 6.3 Hooks Pattern (Referência)

```typescript
// Exemplo: hooks/useProducts.ts

import { useQuery } from '@tanstack/react-query';
import { getPLP, getPDP, type PLPFilters } from '@/services/products';
import { useBrand } from '@/contexts/BrandContext';

export function usePLP(filters: PLPFilters = {}) {
  const { brandId } = useBrand();
  
  return useQuery({
    queryKey: ['plp', brandId, filters],
    queryFn: () => getPLP(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function usePDP(slug: string) {
  const { brandId } = useBrand();
  
  return useQuery({
    queryKey: ['pdp', brandId, slug],
    queryFn: () => getPDP(slug),
    enabled: !!slug,
  });
}

export function useFeaturedProducts(limit = 8) {
  return usePLP({ featured: true, limit });
}
```

---

## 7. SISTEMA DE ORDENAÇÃO

### 7.1 Hierarquia de Ordenação (Padrão "relevance")

1. **featured DESC** - Produtos em destaque primeiro
2. **display_order ASC** - Ordem manual definida no admin
3. **category_display_order ASC** - Ordem da categoria
4. **created_at DESC** - Mais recentes

### 7.2 Campos de Ordenação por Entidade

| Entidade | Campo | Descrição |
|----------|-------|-----------|
| `products` | `display_order` | Ordem manual do produto |
| `categories` | `display_order` | Ordem no menu e listagens |
| `collections` | `sort_order` | Ordem no hero carousel |
| `product_collections` | `display_order` | Ordem do produto na coleção |
| `product_images` | `display_order` | Ordem das fotos |
| `home_banners` | `display_order` | Ordem dos banners |
| `faq_items` | `display_order` | Ordem das perguntas |
| `static_pages` | `display_order` | Ordem no rodapé |
| `footer_links` | `section_order`, `sort_order` | Ordem das seções e links |

---

## 8. FLUXO DE DETECÇÃO DE MARCA

### 8.1 Frontend

```typescript
// lib/brand-detection.ts

import { brands, type BrandConfig } from '@/config/brands';

/**
 * Detecta a marca baseado em:
 * 1. Subdomínio (marca.seshstore.com)
 * 2. Path param (seshstore.com/marca/...)
 * 3. Query param (?brand=marca)
 * 4. Default (sesh-store)
 */
export function detectBrand(): BrandConfig {
  // 1. Subdomínio
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  
  const brandBySubdomain = brands.find(b => b.slug === subdomain);
  if (brandBySubdomain) return brandBySubdomain;
  
  // 2. Path param
  const pathMatch = window.location.pathname.match(/^\/([^/]+)/);
  if (pathMatch) {
    const brandByPath = brands.find(b => b.slug === pathMatch[1]);
    if (brandByPath) return brandByPath;
  }
  
  // 3. Query param
  const params = new URLSearchParams(window.location.search);
  const brandParam = params.get('brand');
  if (brandParam) {
    const brandByParam = brands.find(b => b.slug === brandParam);
    if (brandByParam) return brandByParam;
  }
  
  // 4. Default
  return brands.find(b => b.slug === 'sesh-store')!;
}
```

### 8.2 Context Provider

```typescript
// contexts/BrandContext.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { detectBrand } from '@/lib/brand-detection';
import { supabase } from '@/lib/supabase';
import type { BrandConfig } from '@/config/brands';

interface BrandContextType {
  brand: BrandConfig;
  brandId: string;
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType | null>(null);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandConfig>(() => detectBrand());
  const [brandId, setBrandId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function initBrand() {
      const detectedBrand = detectBrand();
      setBrand(detectedBrand);
      
      // Buscar ID da marca no banco
      const { data } = await supabase
        .rpc('get_brand_by_slug', { p_slug: detectedBrand.slug });
      
      if (data?.[0]) {
        setBrandId(data[0].id);
        
        // Setar contexto para RLS
        await supabase.rpc('set_brand_context', { p_brand_id: data[0].id });
      }
      
      setIsLoading(false);
    }
    
    initBrand();
  }, []);
  
  // Aplicar tema CSS
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', brand.theme.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', brand.theme.secondaryColor);
  }, [brand]);
  
  return (
    <BrandContext.Provider value={{ brand, brandId, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand must be used within BrandProvider');
  return context;
}
```

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

### 9.1 Fase 1: Banco de Dados (Supabase)

- [ ] Criar tabela `brands` com as 3 marcas
- [ ] Criar função `set_brand_context()`
- [ ] Criar função `current_brand_id()`
- [ ] Adicionar `brand_id` em todas as tabelas existentes
- [ ] Criar tabelas faltantes:
  - [ ] `static_pages`
  - [ ] `footer_links`
  - [ ] `product_looks`
- [ ] Criar view `v_plp`
- [ ] Criar view `v_pdp`
- [ ] Criar RPCs de navegação
- [ ] Habilitar RLS em todas as tabelas
- [ ] Criar policies de RLS

### 9.2 Fase 2: Services Layer

- [ ] Criar `services/brand.ts`
- [ ] Criar `services/products.ts`
- [ ] Criar `services/categories.ts`
- [ ] Criar `services/banners.ts`
- [ ] Criar `services/content.ts`
- [ ] Criar `services/cart.ts`
- [ ] Criar `services/orders.ts`
- [ ] Criar `services/settings.ts`

### 9.3 Fase 3: Hooks

- [ ] Migrar/criar `useBrand`
- [ ] Criar `usePLP`
- [ ] Criar `usePDP`
- [ ] Criar `useCategories`
- [ ] Criar `useCollections`
- [ ] Criar `useBanners`
- [ ] Criar `useCart`
- [ ] Criar `useOrders`

### 9.4 Fase 4: Componentes

- [ ] Atualizar `Header` para usar services
- [ ] Atualizar `Footer` para ser dinâmico
- [ ] Atualizar `ProductCard` para usar dados da view
- [ ] Atualizar `ProductGallery`
- [ ] Criar/atualizar filtros PLP
- [ ] Atualizar páginas para usar hooks

### 9.5 Fase 5: Páginas

- [ ] Home page com dados dinâmicos
- [ ] PLP com filtros completos
- [ ] PDP com variantes
- [ ] Carrinho integrado com banco
- [ ] Checkout com criação de pedido
- [ ] Páginas estáticas dinâmicas

### 9.6 Fase 6: Admin (Futuro)

- [ ] CRUD de produtos
- [ ] CRUD de categorias
- [ ] CRUD de coleções
- [ ] CRUD de banners
- [ ] CRUD de páginas estáticas
- [ ] Gestão de pedidos

---

## 10. PÁGINAS INSTITUCIONAIS E RODAPÉ

### 10.1 Sistema de Páginas Estáticas

#### 10.1.1 Conceito

Páginas estáticas são conteúdos institucionais gerenciáveis:
- Política de Privacidade
- Termos de Uso
- Política de Trocas e Devoluções
- Sobre a Marca
- Guia de Tamanhos
- etc.

#### 10.1.2 Service `content.ts`

```typescript
// services/content.ts

import { supabase } from '@/lib/supabase';
import { getCurrentBrandId } from './brand';

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  is_active: boolean;
  display_order: number | null;
}

/**
 * Busca uma página estática pelo slug
 */
export async function getStaticPageBySlug(slug: string): Promise<StaticPage | null> {
  const brandId = getCurrentBrandId();
  
  await supabase.rpc('set_brand_context', { p_brand_id: brandId });
  
  const { data, error } = await supabase
    .from('static_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  
  if (error || !data) return null;
  return data;
}

/**
 * Lista todas as páginas estáticas ativas
 */
export async function getAllStaticPages(): Promise<StaticPage[]> {
  const brandId = getCurrentBrandId();
  
  await supabase.rpc('set_brand_context', { p_brand_id: brandId });
  
  const { data, error } = await supabase
    .from('static_pages')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });
  
  if (error) throw error;
  return data || [];
}
```

#### 10.1.3 Hook `useStaticPage`

```typescript
// hooks/useStaticPage.ts

import { useQuery } from '@tanstack/react-query';
import { getStaticPageBySlug } from '@/services/content';
import { useBrand } from '@/contexts/BrandContext';

export function useStaticPage(slug: string) {
  const { brandId } = useBrand();
  
  return useQuery({
    queryKey: ['static-page', brandId, slug],
    queryFn: () => getStaticPageBySlug(slug),
    enabled: !!slug && !!brandId,
    staleTime: 1000 * 60 * 30, // 30 minutos
  });
}
```

#### 10.1.4 Componente `StaticPage.tsx`

```typescript
// pages/StaticPage.tsx

import { useParams } from 'react-router-dom';
import { useStaticPage } from '@/hooks/useStaticPage';
import { Helmet } from 'react-helmet-async';

export function StaticPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = useStaticPage(slug!);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // 404
  if (!page || error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Página não encontrada</h1>
        <p className="text-gray-600">
          A página que você está procurando não existe ou foi removida.
        </p>
      </div>
    );
  }
  
  // Detecta se o conteúdo é HTML
  const isHTML = /<[^>]+>/.test(page.content);
  
  return (
    <>
      <Helmet>
        <title>{page.meta_title || page.title}</title>
        {page.meta_description && (
          <meta name="description" content={page.meta_description} />
        )}
      </Helmet>
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">{page.title}</h1>
        
        {isHTML ? (
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ) : (
          <div className="prose prose-lg max-w-none whitespace-pre-wrap">
            {page.content}
          </div>
        )}
      </div>
    </>
  );
}
```

#### 10.1.5 Rota

```typescript
<Route path="/pagina/:slug" element={<StaticPage />} />
```

#### 10.1.6 Páginas Hardcoded vs Dinâmicas

| Página | Tipo | Tabela | Observação |
|--------|------|--------|------------|
| Política de Privacidade | Dinâmica | `static_pages` | 100% do banco |
| Termos de Uso | Dinâmica | `static_pages` | 100% do banco |
| Sobre Nós | Híbrida | `company_story` | Layout fixo + dados |
| FAQ | Híbrida | `faq_items` | Accordion + dados |
| Contato | Híbrida | `contact_messages` | Formulário + salva |
| Trocas | Dinâmica | `static_pages` | 100% do banco |

---

### 10.2 Sistema de Rodapé Dinâmico

#### 10.2.1 Layout Visual do Rodapé

```
┌─────────────────────────────────────────────────────────────────┐
│                            FOOTER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LOGO + DESCRIÇÃO       INSTITUCIONAL     ATENDIMENTO    REDES │
│  ─────────────────      ─────────────     ───────────    ───── │
│  [Logo da marca]        • Sobre Nós       • Contato      [IG]  │
│  Texto descritivo       • Nossa História  • FAQ          [FB]  │
│  da marca...            • Política Priv.  • Trocas       [TT]  │
│                         • Termos de Uso   • Rastreio     [YT]  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  © 2026 Marca. Todos os direitos reservados. CNPJ: XX.XXX.XXX  │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.2.2 Tipos de Link no Rodapé

| `link_type` | `reference_id` | `url` | Exemplo |
|-------------|----------------|-------|---------|
| `static_page` | UUID da página | NULL | Política de Privacidade |
| `internal` | NULL | `/contato` | Página interna |
| `external` | NULL | `https://instagram.com/marca` | Link externo |

#### 10.2.3 Service `footer.ts`

```typescript
// services/footer.ts

import { supabase } from '@/lib/supabase';
import { getCurrentBrandId } from './brand';

export interface FooterLink {
  id: string;
  section: string;
  section_order: number;
  label: string;
  link_type: 'static_page' | 'internal' | 'external';
  reference_id: string | null;
  url: string | null;
  target: '_self' | '_blank';
  sort_order: number;
  resolved_url?: string;
}

export interface FooterSection {
  name: string;
  order: number;
  links: FooterLink[];
}

/**
 * Busca links do rodapé agrupados por seção
 */
export async function getFooterLinks(): Promise<FooterSection[]> {
  const brandId = getCurrentBrandId();
  
  await supabase.rpc('set_brand_context', { p_brand_id: brandId });
  
  const { data, error } = await supabase
    .from('footer_links')
    .select(`
      *,
      static_page:static_pages(slug)
    `)
    .order('section_order', { ascending: true })
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  if (!data) return [];
  
  // Resolver URLs
  const linksWithUrls = data.map(link => ({
    ...link,
    resolved_url: resolveUrl(link)
  }));
  
  // Agrupar por seção
  const sections = new Map<string, FooterSection>();
  
  for (const link of linksWithUrls) {
    if (!sections.has(link.section)) {
      sections.set(link.section, {
        name: link.section,
        order: link.section_order,
        links: []
      });
    }
    sections.get(link.section)!.links.push(link);
  }
  
  return Array.from(sections.values()).sort((a, b) => a.order - b.order);
}

function resolveUrl(link: any): string {
  switch (link.link_type) {
    case 'static_page':
      return `/pagina/${link.static_page?.slug || ''}`;
    case 'internal':
    case 'external':
      return link.url || '#';
    default:
      return '#';
  }
}
```

#### 10.2.4 Hook `useFooter`

```typescript
// hooks/useFooter.ts

import { useQuery } from '@tanstack/react-query';
import { getFooterLinks } from '@/services/footer';
import { useBrand } from '@/contexts/BrandContext';

export function useFooter() {
  const { brandId } = useBrand();
  
  return useQuery({
    queryKey: ['footer-links', brandId],
    queryFn: getFooterLinks,
    enabled: !!brandId,
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}
```

#### 10.2.5 Componente `Footer.tsx`

```typescript
// components/Footer.tsx

import { Link } from 'react-router-dom';
import { useFooter } from '@/hooks/useFooter';
import { useBrand } from '@/contexts/BrandContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { Instagram, Facebook, Twitter, Youtube } from 'lucide-react';

export function Footer() {
  const { brand } = useBrand();
  const { data: sections, isLoading } = useFooter();
  const { data: settings } = useStoreSettings();
  
  const socialIcons: Record<string, React.ComponentType<any>> = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    youtube: Youtube,
  };
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Coluna 1: Logo e descrição */}
          <div className="lg:col-span-1">
            <img 
              src={brand.theme.logo} 
              alt={brand.name}
              className="h-8 mb-4"
            />
            <p className="text-gray-400 text-sm mb-4">
              {settings?.company_name || brand.name}
            </p>
            
            {/* Redes sociais */}
            {settings?.social_media && (
              <div className="flex gap-4">
                {Object.entries(settings.social_media).map(([network, url]) => {
                  const Icon = socialIcons[network];
                  if (!Icon || !url) return null;
                  return (
                    <a
                      key={network}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Colunas dinâmicas */}
          {isLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-5 bg-gray-700 rounded w-24 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-32"></div>
                    <div className="h-4 bg-gray-700 rounded w-28"></div>
                    <div className="h-4 bg-gray-700 rounded w-36"></div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            sections?.map(section => (
              <div key={section.name}>
                <h3 className="font-semibold text-lg mb-4">{section.name}</h3>
                <ul className="space-y-2">
                  {section.links.map(link => (
                    <li key={link.id}>
                      {link.link_type === 'external' ? (
                        <a
                          href={link.resolved_url}
                          target={link.target}
                          rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                          className="text-gray-400 hover:text-white transition-colors text-sm"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.resolved_url || '#'}
                          className="text-gray-400 hover:text-white transition-colors text-sm"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          
        </div>
      </div>
      
      {/* Barra inferior */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© {new Date().getFullYear()} {brand.name}. Todos os direitos reservados.</p>
            {settings?.tax_id && <p>CNPJ: {settings.tax_id}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}
```

#### 10.2.6 Seed de Dados (Exemplo)

```sql
-- Seed de links do rodapé para Sesh Store
INSERT INTO footer_links (brand_id, section, section_order, label, link_type, url, sort_order) VALUES
-- Institucional
((SELECT id FROM brands WHERE slug = 'sesh-store'), 'Institucional', 1, 'Sobre Nós', 'internal', '/sobre', 1),
((SELECT id FROM brands WHERE slug = 'sesh-store'), 'Institucional', 1, 'Nossa História', 'internal', '/nossa-historia', 2),
-- Atendimento  
((SELECT id FROM brands WHERE slug = 'sesh-store'), 'Atendimento', 2, 'Contato', 'internal', '/contato', 1),
((SELECT id FROM brands WHERE slug = 'sesh-store'), 'Atendimento', 2, 'FAQ', 'internal', '/faq', 2),
((SELECT id FROM brands WHERE slug = 'sesh-store'), 'Atendimento', 2, 'Trocas e Devoluções', 'internal', '/trocas', 3);
```

---

### 10.3 Página de Contato

#### 10.3.1 Schema de Validação (Zod)

```typescript
// schemas/contact.ts

import { z } from 'zod';

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  
  email: z
    .string()
    .email('Email inválido'),
  
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/.test(val),
      'Telefone inválido'
    ),
  
  subject: z
    .string()
    .max(200, 'Assunto muito longo')
    .optional(),
  
  message: z
    .string()
    .min(10, 'Mensagem deve ter pelo menos 10 caracteres')
    .max(5000, 'Mensagem muito longa'),
});

export type ContactFormSchema = z.infer<typeof contactFormSchema>;
```

#### 10.3.2 Service `contact.ts`

```typescript
// services/contact.ts

import { supabase } from '@/lib/supabase';
import { getCurrentBrandId } from './brand';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/**
 * Envia mensagem de contato
 */
export async function sendContactMessage(data: ContactFormData): Promise<void> {
  const brandId = getCurrentBrandId();
  
  const { error } = await supabase
    .from('contact_messages')
    .insert({
      brand_id: brandId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      subject: data.subject?.trim() || null,
      message: data.message.trim(),
      status: 'pending'
    });
  
  if (error) throw error;
}
```

#### 10.3.3 Componente `ContactPage.tsx`

```typescript
// pages/ContactPage.tsx

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

import { contactFormSchema, type ContactFormSchema } from '@/schemas/contact';
import { sendContactMessage } from '@/services/contact';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useBrand } from '@/contexts/BrandContext';

export function ContactPage() {
  const { brand } = useBrand();
  const { data: settings } = useStoreSettings();
  const [submitted, setSubmitted] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ContactFormSchema>({
    resolver: zodResolver(contactFormSchema)
  });
  
  const mutation = useMutation({
    mutationFn: sendContactMessage,
    onSuccess: () => {
      setSubmitted(true);
      reset();
    }
  });
  
  const onSubmit = (data: ContactFormSchema) => {
    mutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Contato</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Informações de contato */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-6">Fale Conosco</h2>
          
          <div className="space-y-4">
            {settings?.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a 
                    href={`mailto:${settings.email}`}
                    className="hover:underline"
                    style={{ color: brand.theme.primaryColor }}
                  >
                    {settings.email}
                  </a>
                </div>
              </div>
            )}
            
            {settings?.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <a href={`tel:${settings.phone}`} className="hover:underline">
                    {settings.phone}
                  </a>
                </div>
              </div>
            )}
            
            {settings?.whatsapp && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">WhatsApp</p>
                  <a 
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: brand.theme.primaryColor }}
                  >
                    {settings.whatsapp}
                  </a>
                </div>
              </div>
            )}
            
            {settings?.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Endereço</p>
                  <p className="text-sm">
                    {settings.address.street}, {settings.address.number}
                    {settings.address.complement && ` - ${settings.address.complement}`}
                    <br />
                    {settings.address.neighborhood} - {settings.address.city}/{settings.address.state}
                    <br />
                    CEP: {settings.address.zip_code}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Horário de atendimento */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Horário de Atendimento</h3>
            <p className="text-sm text-gray-600">
              Segunda a Sexta: 9h às 18h<br />
              Sábado: 9h às 13h
            </p>
          </div>
        </div>
        
        {/* Formulário */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="text-center py-12 bg-green-50 rounded-lg">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Mensagem Enviada!</h2>
              <p className="text-gray-600 mb-6">
                Recebemos sua mensagem e responderemos em breve.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-sm underline"
                style={{ color: brand.theme.primaryColor }}
              >
                Enviar nova mensagem
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium mb-2">Nome completo *</label>
                  <input
                    type="text"
                    {...register('name')}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-gray-200'
                    }`}
                    placeholder="Seu nome"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                </div>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-gray-200'
                    }`}
                    placeholder="seu@email.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium mb-2">Telefone</label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-gray-200'
                    }`}
                    placeholder="(11) 99999-9999"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
                </div>
                
                {/* Assunto */}
                <div>
                  <label className="block text-sm font-medium mb-2">Assunto</label>
                  <input
                    type="text"
                    {...register('subject')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder="Sobre o que deseja falar?"
                  />
                </div>
              </div>
              
              {/* Mensagem */}
              <div>
                <label className="block text-sm font-medium mb-2">Mensagem *</label>
                <textarea
                  {...register('message')}
                  rows={6}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                    errors.message ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-gray-200'
                  }`}
                  placeholder="Escreva sua mensagem..."
                />
                {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>}
              </div>
              
              {/* Erro geral */}
              {mutation.error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                  Erro ao enviar mensagem. Tente novamente.
                </div>
              )}
              
              {/* Botão */}
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="w-full md:w-auto px-8 py-3 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: brand.theme.primaryColor }}
              >
                {(isSubmitting || mutation.isPending) ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Mensagem
                  </>
                )}
              </button>
            </form>
          )}
        </div>
        
      </div>
    </div>
  );
}
```

---

### 10.4 Página de FAQ

#### 10.4.1 Service `faq.ts`

```typescript
// services/faq.ts

import { supabase } from '@/lib/supabase';
import { getCurrentBrandId } from './brand';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

export async function getFAQItems(): Promise<FAQItem[]> {
  const brandId = getCurrentBrandId();
  
  await supabase.rpc('set_brand_context', { p_brand_id: brandId });
  
  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}
```

#### 10.4.2 Componente `FAQPage.tsx`

```typescript
// pages/FAQPage.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { getFAQItems } from '@/services/faq';
import { useBrand } from '@/contexts/BrandContext';

export function FAQPage() {
  const { brandId, brand } = useBrand();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const { data: items, isLoading } = useQuery({
    queryKey: ['faq', brandId],
    queryFn: getFAQItems,
    enabled: !!brandId,
  });
  
  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-4">Perguntas Frequentes</h1>
      <p className="text-gray-600 mb-8">Encontre respostas para as dúvidas mais comuns.</p>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse border rounded-lg p-4">
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items?.map((item, index) => (
            <div key={item.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left font-medium hover:bg-gray-50 transition-colors"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openIndex === index && (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <p className="text-gray-600 whitespace-pre-wrap">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* CTA para contato */}
      <div className="mt-12 p-6 bg-gray-100 rounded-lg text-center">
        <h2 className="text-xl font-semibold mb-2">Não encontrou sua resposta?</h2>
        <p className="text-gray-600 mb-4">Entre em contato conosco e tire suas dúvidas.</p>
        <a
          href="/contato"
          className="inline-block px-6 py-3 text-white font-medium rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: brand.theme.primaryColor }}
        >
          Fale Conosco
        </a>
      </div>
    </div>
  );
}
```

---

### 10.5 Checklist de Implementação (Páginas Institucionais)

#### Banco de Dados
- [ ] Criar tabela `static_pages`
- [ ] Criar tabela `footer_links`
- [ ] Criar tabela `faq_items` (se não existir)
- [ ] Criar tabela `contact_messages` (se não existir)
- [ ] Popular `footer_links` com dados iniciais
- [ ] Popular `static_pages` com páginas básicas
- [ ] Popular `faq_items` com perguntas comuns

#### Services
- [ ] Criar `services/content.ts`
- [ ] Criar `services/footer.ts`
- [ ] Criar `services/faq.ts`
- [ ] Criar `services/contact.ts`

#### Hooks
- [ ] Criar `useStaticPage`
- [ ] Criar `useFooter`
- [ ] Criar `useFAQ`

#### Componentes
- [ ] Criar `Footer.tsx` dinâmico
- [ ] Criar `StaticPage.tsx`
- [ ] Criar `ContactPage.tsx`
- [ ] Criar `FAQPage.tsx`

#### Schemas
- [ ] Criar schema Zod para formulário de contato

#### Rotas
- [ ] `/pagina/:slug` - Páginas estáticas
- [ ] `/contato` - Página de contato
- [ ] `/faq` - FAQ

---

## 11. MIGRATIONS PRONTAS

### 11.1 Migration Inicial Completa

O Claude Code deve criar uma migration que:

1. Cria tabela `brands` com as 3 marcas
2. Adiciona `brand_id` nas tabelas existentes
3. Cria todas as tabelas novas
4. Cria as views otimizadas
5. Cria as funções RPC
6. Configura RLS completo

**Arquivo sugerido:** `supabase/migrations/YYYYMMDD_multitenant_setup.sql`

---

## 12. PONTOS DE ATENÇÃO

### 14.1 Performance

- **Views com RLS**: O RLS adiciona overhead. Monitorar queries lentas.
- **Índices**: Garantir índices em `brand_id` de todas as tabelas.
- **Cache**: Usar React Query com `staleTime` adequado.

### 14.2 Segurança

- **RLS obrigatório**: Nunca confiar apenas no filtro do frontend.
- **Validação de brand_id**: Validar no backend que o usuário tem acesso à marca.
- **Contexto de sessão**: `set_brand_context` deve ser chamado a cada request.

### 12.3 UX

- **Loading states**: Mostrar skeleton enquanto carrega dados da marca.
- **Fallbacks**: Ter dados mockados para desenvolvimento.
- **Tema instantâneo**: Aplicar cores antes de carregar dados do banco.

### 12.4 Manutenibilidade

- **Services únicos**: Toda lógica de dados em services, não em componentes.
- **Types centralizados**: Manter types gerados do Supabase atualizados.
- **Documentação**: Comentar funções SQL complexas.

---

## 13. REFERÊNCIAS

### 14.1 Documentos Base

- `5S Brand Architecture.md` - Arquitetura de referência
- `Sesh Store Summary.md` - Estado atual do projeto

### 14.2 Recursos Externos

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query Patterns](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand Best Practices](https://github.com/pmndrs/zustand)

---

## 14. NOTAS PARA O CLAUDE CODE

### 14.1 Decisões Livres

O Claude Code tem liberdade para decidir:

- **Estrutura de pastas**: Pode reorganizar conforme necessário
- **Bibliotecas**: Pode adicionar/remover dependências
- **Padrões de código**: Seguir o que já existe no projeto
- **Nomenclatura**: Manter consistência com o código existente

### 14.2 Decisões Fixas

Não alterar sem discussão:

- **Estratégia RLS**: Usar `brand_id` em todas as tabelas
- **Views otimizadas**: Manter `v_plp` e `v_pdp`
- **Services layer**: Manter separação de responsabilidades
- **3 marcas iniciais**: Sesh Store, Grupo GOT, The OG

### 14.3 Ferramentas Disponíveis

- **Context7 MCP**: Para pesquisar documentação de bibliotecas
- **Supabase MCP**: Para criar/alterar estrutura do banco
- **Web Search**: Para buscar boas práticas

### 14.4 Prioridades

1. **Banco de dados primeiro**: Estrutura correta antes de código
2. **Services depois**: Camada de dados limpa
3. **UI por último**: Componentes consomem services

---

**FIM DO PRD**

---

*Este documento deve ser usado como guia pelo Claude Code para implementar a arquitetura multitenant no projeto Sesh Store. O Claude Code tem autonomia para decisões técnicas específicas, desde que mantenha os princípios arquiteturais definidos.*
