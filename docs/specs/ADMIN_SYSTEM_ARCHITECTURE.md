# Sesh Store — Documentação Técnica para Sistema de Administração

> **Autor:** Equipe de Arquitetura
> **Data:** 14/02/2026
> **Versão:** 1.0
> **Objetivo:** Fornecer ao desenvolvedor responsável pelo painel administrativo toda a base técnica necessária para construção do sistema.

---

## Sumário

1. [Visão Geral da Plataforma](#1-visão-geral-da-plataforma)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Modelo de Multi-Tenancy](#3-modelo-de-multi-tenancy)
4. [Esquema do Banco de Dados](#4-esquema-do-banco-de-dados)
5. [Diagrama de Relacionamentos](#5-diagrama-de-relacionamentos)
6. [Autenticação e Autorização](#6-autenticação-e-autorização)
7. [Row Level Security (RLS)](#7-row-level-security-rls)
8. [Funções e Triggers do Banco](#8-funções-e-triggers-do-banco)
9. [Fluxos Críticos de Negócio](#9-fluxos-críticos-de-negócio)
10. [Estrutura do Projeto Atual (Storefront)](#10-estrutura-do-projeto-atual-storefront)
11. [Variáveis de Ambiente](#11-variáveis-de-ambiente)
12. [Recomendações para o Painel Admin](#12-recomendações-para-o-painel-admin)
13. [Considerações de Segurança](#13-considerações-de-segurança)
14. [Apêndice — Tabelas Completas](#14-apêndice--tabelas-completas)

---

## 1. Visão Geral da Plataforma

O **Sesh Store** é uma plataforma e-commerce **multi-tenant** que opera múltiplas marcas a partir de um único codebase e banco de dados compartilhado. Cada marca (tenant) possui configuração visual, catálogo de produtos, pedidos e conteúdo institucional completamente isolados.

### Marcas Atuais

| Marca | Slug | Domínio | Cor Primária |
|-------|------|---------|--------------|
| Sesh Store | `sesh` | seshstore.com.br | `#41BAC2` (Cyan) |
| Grupo GOT | `grupogot` | grupogot.com | `#000000` (Preto) |
| The OG | `theog` | theog.com.br | `#6A226C` (Roxo) |

### O que Existe Hoje

- **Storefront (loja):** App React completo com catálogo, carrinho, checkout, pedidos, páginas institucionais
- **O que precisa ser construído:** Painel administrativo para gestão de todas as marcas, produtos, pedidos, conteúdo e configurações

---

## 2. Stack Tecnológica

### Frontend (Storefront Existente)

| Tecnologia | Versão | Função |
|-----------|--------|--------|
| React | 19.2.3 | Framework UI |
| TypeScript | 5.8.2 | Tipagem estática |
| Vite | 6.2.0 | Build tool (porta 3009) |
| Tailwind CSS | 4.1.18 | Estilização utility-first |
| React Router DOM | 7.12.0 | Roteamento (HashRouter) |
| TanStack React Query | 5.90.19 | Server state / cache |
| Zustand | 5.0.10 | State management (carrinho) |
| Framer Motion | 12.31.0 | Animações |
| React Hook Form | 7.71.1 | Formulários |
| Zod | 4.3.6 | Validação de schemas |
| Fuse.js | 7.1.0 | Busca fuzzy |

### Backend / Infraestrutura

| Tecnologia | Função |
|-----------|--------|
| **Supabase** | BaaS — PostgreSQL + Auth + Storage + Edge Functions + RLS |
| **PostgreSQL** (via Supabase) | Banco de dados relacional com RLS nativo |
| **Supabase Auth** | Autenticação (email/senha + magic link) |
| **Supabase Edge Functions** | Serverless functions (cálculo de frete) |
| **Asaas** | Gateway de pagamento principal (sandbox + production) |
| **Stripe** | Gateway de pagamento secundário (disponível) |
| **Frenet** | API de cálculo de frete (múltiplas transportadoras) |
| **ViaCEP** | Consulta de endereço por CEP |

### Observação Importante para o Admin

O admin **deve usar o mesmo Supabase project** e **as mesmas tabelas**. Pode ser:
- Um app separado (recomendado) no mesmo monorepo ou repo separado
- Compartilha o mesmo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Usa **Supabase Auth** para login do admin, com verificação de `role = 'admin'`

---

## 3. Modelo de Multi-Tenancy

### Arquitetura: Shared Database, Shared Schema

Todos os tenants compartilham o **mesmo banco de dados** e as **mesmas tabelas**. O isolamento é feito por:

1. **`brand_id` (UUID)** — Presente em todas as tabelas de dados. É a chave estrangeira para `brands.id`
2. **Row Level Security (RLS)** — Políticas no PostgreSQL que filtram automaticamente por `brand_id`
3. **Tabela `brands`** — Tabela mestra que define cada tenant

### Como a Detecção de Marca Funciona (Storefront)

```
Prioridade de detecção:
1. Hash URL      → /#/sesh/shop → slug = "sesh"
2. localStorage  → brand_override (dev only)
3. Hostname      → seshstore.com.br → slug = "sesh"
4. Fallback      → "sesh"
```

O arquivo `src/lib/brand-detection.ts` implementa essa lógica.

### Como Deve Funcionar no Admin

No painel admin, o operador precisa:
- **Ver todas as marcas** que tem acesso
- **Selecionar uma marca** como contexto ativo (brand switcher)
- **Todas as operações CRUD** devem incluir o `brand_id` da marca selecionada
- Um super-admin pode ver/gerenciar todas as marcas
- Um admin de marca específica só vê suas marcas (filtrar via `user_brands`)

### Tabelas de Associação

```sql
-- Tabela users (perfil customizado, não é auth.users)
users (
  id UUID → auth.users.id,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT -- 'user' | 'admin'
)

-- Associação usuário ↔ marca
user_brands (
  user_id UUID → users.id,
  brand_slug TEXT,
  created_at TIMESTAMP
)
```

**Lógica:** Um admin com `role = 'admin'` e registros em `user_brands` para `['sesh', 'theog']` só pode administrar essas duas marcas.

---

## 4. Esquema do Banco de Dados

### Tabela Mestra: `brands`

```sql
brands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,          -- 'sesh', 'grupogot', 'theog'
  name          TEXT NOT NULL,
  domain        TEXT UNIQUE,                   -- 'seshstore.com.br'

  -- Tema visual (JSONB validado por função)
  theme         JSONB, -- {primaryColor, secondaryColor, backgroundColor, textColor, logo, favicon, font}

  -- Features habilitadas (JSONB validado)
  features      JSONB, -- {installments, loyalty, giftCards, reviews}

  -- Configurações de negócio (JSONB validado)
  settings      JSONB, -- {minOrderValue, freeShippingThreshold, maxInstallments, contact{}, social{}}

  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
)
```

### Tabelas de Catálogo

#### `products`
```sql
products (
  id                  UUID PRIMARY KEY,
  brand_id            UUID REFERENCES brands(id) NOT NULL,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,               -- Único por brand
  description         TEXT,
  price               DECIMAL(10,2) NOT NULL,
  compare_at_price    DECIMAL(10,2),               -- Preço "de" (riscado)
  cost                DECIMAL(10,2),               -- Custo para cálculo de margem
  category            TEXT,
  subcategory         TEXT,
  tags                TEXT[],                       -- Array de tags
  active              BOOLEAN DEFAULT true,
  featured            BOOLEAN DEFAULT false,
  available_for_sale  BOOLEAN DEFAULT true,
  meta_title          TEXT,
  meta_description    TEXT,
  deleted_at          TIMESTAMPTZ,                  -- Soft delete
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ
)
-- Constraint: UNIQUE(brand_id, slug)
```

#### `product_images`
```sql
product_images (
  id          UUID PRIMARY KEY,
  product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  position    INTEGER DEFAULT 0,    -- Ordem de exibição
  width       INTEGER,
  height      INTEGER,
  size_bytes  INTEGER,
  created_at  TIMESTAMPTZ
)
```

#### `product_variants` (Variantes de tamanho/cor)
```sql
product_variants (
  id              UUID PRIMARY KEY,
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  color           TEXT,
  color_hex       TEXT,               -- #FF0000
  size            TEXT,
  sku             TEXT UNIQUE,        -- Único globalmente
  barcode         TEXT,
  stock           INTEGER DEFAULT 0,
  reserved_stock  INTEGER DEFAULT 0,
  weight          DECIMAL(8,3),       -- kg
  dimensions      JSONB,              -- {length, width, height}
  active          BOOLEAN DEFAULT true,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)
-- Checks: stock >= 0, reserved_stock >= 0, reserved_stock <= stock
```

#### `categories` (Hierárquicas — suporta subcategorias)
```sql
categories (
  id                UUID PRIMARY KEY,
  brand_id          UUID REFERENCES brands(id),
  parent_id         UUID REFERENCES categories(id),  -- Self-join para hierarquia
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  banner_url        TEXT,
  banner_mobile_url TEXT,
  icon              TEXT,
  position          INTEGER DEFAULT 0,
  active            BOOLEAN DEFAULT true,
  featured          BOOLEAN DEFAULT false,
  show_in_menu      BOOLEAN DEFAULT true,
  is_tabacaria      BOOLEAN DEFAULT false,   -- Flag especial de categoria
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
-- Constraint: UNIQUE(brand_id, slug)
```

#### `collections` (Coleções manuais de produtos)
```sql
collections (
  id                UUID PRIMARY KEY,
  brand_id          UUID REFERENCES brands(id),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  banner_url        TEXT,
  banner_mobile_url TEXT,
  active            BOOLEAN DEFAULT true,
  featured          BOOLEAN DEFAULT false,
  start_date        TIMESTAMPTZ,
  end_date          TIMESTAMPTZ,
  meta_title        TEXT,
  meta_description  TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
-- Constraint: UNIQUE(brand_id, slug)
```

#### `collection_products` (Junção N:N)
```sql
collection_products (
  collection_id  UUID REFERENCES collections(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id) ON DELETE CASCADE,
  position       INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
)
```

### Tabelas de Pedidos

#### `orders`
```sql
orders (
  id                    UUID PRIMARY KEY,
  brand_id              UUID REFERENCES brands(id),
  user_id               UUID REFERENCES auth.users(id),    -- NULL para checkout guest

  -- Número do pedido (gerado por trigger)
  order_number          TEXT UNIQUE,   -- Formato: SESH-2026-0001

  -- Dados do cliente (snapshot no momento do pedido)
  customer_name         TEXT,
  customer_email        TEXT,
  customer_phone        TEXT,
  customer_cpf          TEXT,

  -- Endereços (JSONB)
  shipping_address      JSONB,
  billing_address       JSONB,

  -- Valores
  subtotal              DECIMAL(10,2),
  shipping_cost         DECIMAL(10,2),
  discount              DECIMAL(10,2) DEFAULT 0,
  total                 DECIMAL(10,2),

  -- Status (enums como TEXT)
  status                TEXT DEFAULT 'pending',
    -- pending | paid | processing | shipped | delivered | cancelled
  payment_status        TEXT DEFAULT 'pending',
    -- pending | paid | failed
  fulfillment_status    TEXT DEFAULT 'unfulfilled',
    -- unfulfilled | processing | shipped | delivered

  -- Pagamento (Asaas)
  asaas_payment_id      TEXT,
  asaas_invoice_url     TEXT,
  payment_method        TEXT,           -- pix | credit_card | boleto
  installments          INTEGER,
  payment_metadata      JSONB,

  -- Cupom
  coupon_code           TEXT,
  discount_amount       DECIMAL(10,2),

  -- Rastreamento
  tracking_code         TEXT,
  tracking_url          TEXT,

  -- Notas
  customer_notes        TEXT,
  internal_notes        TEXT,

  -- Timestamps de eventos
  paid_at               TIMESTAMPTZ,
  shipped_at            TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,

  -- Reserva de estoque
  reservation_confirmed BOOLEAN DEFAULT false,
  reserved_until        TIMESTAMPTZ,

  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ
)
```

**Trigger automático:** `generate_order_number_trigger` gera o `order_number` no INSERT usando sequences PostgreSQL por marca/ano. Thread-safe.

#### `order_items` (Snapshot imutável)
```sql
order_items (
  id                UUID PRIMARY KEY,
  order_id          UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id),
  variant_id        UUID REFERENCES product_variants(id),
  brand_id          UUID REFERENCES brands(id),  -- Desnormalizado para relatórios

  -- Dados congelados no momento da compra
  product_name      TEXT NOT NULL,
  variant_name      TEXT,
  sku               TEXT,
  product_image_url TEXT,

  price             DECIMAL(10,2) NOT NULL,
  quantity          INTEGER NOT NULL,
  subtotal          DECIMAL(10,2) NOT NULL,   -- CHECK: subtotal = price * quantity

  created_at        TIMESTAMPTZ
)
-- CHECK: quantity > 0
```

### Tabelas de Cupons e Estoque

#### `coupons`
```sql
coupons (
  id                UUID PRIMARY KEY,
  brand_id          UUID REFERENCES brands(id),
  code              TEXT NOT NULL,           -- Case-insensitive
  description       TEXT,
  discount_type     TEXT NOT NULL,           -- 'percentage' | 'fixed'
  discount_value    DECIMAL(10,2) NOT NULL,
  minimum_purchase  DECIMAL(10,2),
  maximum_discount  DECIMAL(10,2),
  usage_limit       INTEGER,                -- NULL = ilimitado
  usage_count       INTEGER DEFAULT 0,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  active            BOOLEAN DEFAULT true,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
-- Constraint: UNIQUE(brand_id, code)
```

#### `coupon_uses` (Histórico de uso)
```sql
coupon_uses (
  id                UUID PRIMARY KEY,
  coupon_id         UUID REFERENCES coupons(id),
  order_id          UUID REFERENCES orders(id),
  brand_id          UUID REFERENCES brands(id),
  discount_applied  DECIMAL(10,2),
  order_total       DECIMAL(10,2),
  created_at        TIMESTAMPTZ
)
```

#### `stock_reservations` (Reservas temporárias de estoque)
```sql
stock_reservations (
  id              UUID PRIMARY KEY,
  order_id        UUID REFERENCES orders(id),
  product_id      UUID REFERENCES products(id),
  variant_id      UUID REFERENCES product_variants(id),
  brand_id        UUID REFERENCES brands(id),
  quantity        INTEGER NOT NULL,
  reserved_until  TIMESTAMPTZ NOT NULL,
  status          TEXT DEFAULT 'pending',
    -- pending | confirmed | cancelled | expired
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  expired_at      TIMESTAMPTZ
)
```

### Tabelas de Conteúdo

#### `store_faqs`
```sql
store_faqs (
  id          UUID PRIMARY KEY,
  brand_id    UUID REFERENCES brands(id),
  category    TEXT DEFAULT 'geral',    -- Categoria do FAQ
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  position    INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
)
```

#### `static_pages` (Páginas dinâmicas)
```sql
static_pages (
  id                UUID PRIMARY KEY,
  brand_id          UUID REFERENCES brands(id),
  slug              TEXT NOT NULL,         -- 'about', 'privacy', 'terms', etc.
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,         -- HTML ou Markdown
  meta_title        TEXT,
  meta_description  TEXT,
  position          INTEGER DEFAULT 0,
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
-- Constraint: UNIQUE(brand_id, slug)
```

#### `footer_links`
```sql
footer_links (
  id          UUID PRIMARY KEY,
  brand_id    UUID REFERENCES brands(id),
  group_name  TEXT NOT NULL,       -- 'institucional', 'ajuda', 'redes_sociais'
  label       TEXT NOT NULL,
  url         TEXT NOT NULL,
  icon        TEXT,
  is_external BOOLEAN DEFAULT false,
  position    INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
)
```

#### `banners` (Banners promocionais)
```sql
banners (
  id                UUID PRIMARY KEY,
  brand_id          UUID REFERENCES brands(id),
  title             TEXT,
  subtitle          TEXT,
  image_url         TEXT NOT NULL,
  mobile_image_url  TEXT,
  cta_text          TEXT,
  cta_link          TEXT,
  position          INTEGER DEFAULT 0,
  active            BOOLEAN DEFAULT true,
  start_date        TIMESTAMPTZ,
  end_date          TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
)
```

---

## 5. Diagrama de Relacionamentos

```
┌─────────────────────────────────────────────────────────────────────┐
│                            brands                                    │
│  (id, slug, name, domain, theme, features, settings)                │
└───────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────┘
        │      │      │      │      │      │      │      │      │
        ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
   products  orders  coupons collections categories store  static footer banners
        │      │      │        │                   _faqs  _pages _links
        │      │      │        │
        ▼      ▼      ▼        ▼
   ┌────┴───┐  │   coupon   collection
   │        │  │   _uses    _products
   ▼        ▼  │              │
 product  product ▼            ▼
 _images  _variants order    products
              │    _items
              │      │
              ▼      ▼
          stock_reservations
```

### Relacionamentos Chave

```
brands          1 ──── N  products
brands          1 ──── N  orders
brands          1 ──── N  categories
brands          1 ──── N  collections
brands          1 ──── N  coupons
brands          1 ──── N  banners
brands          1 ──── N  store_faqs
brands          1 ──── N  static_pages
brands          1 ──── N  footer_links

products        1 ──── N  product_images
products        1 ──── N  product_variants
products        N ──── N  collections      (via collection_products)

orders          1 ──── N  order_items
orders          1 ──── N  stock_reservations
orders          N ──── 1  auth.users       (nullable — guest checkout)

coupons         1 ──── N  coupon_uses

categories      1 ──── N  categories       (self-join via parent_id)

users           N ──── N  brands           (via user_brands — acesso admin)
```

---

## 6. Autenticação e Autorização

### Implementação Atual

**Arquivo:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;              // Supabase Auth user
  profile: UserProfile | null;    // Custom profile (users table)
  userBrands: UserBrand[];        // Brands the user has access to
  session: Session | null;
  loading: boolean;

  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName?: string, brandSlug?: string): Promise<void>;
  signInWithMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  hasAccessToBrand(brandSlug: string): boolean;
}
```

### Fluxo de Signup

```
1. Supabase Auth → cria usuário em auth.users
2. INSERT em users → perfil com role 'user'
3. INSERT em user_brands → associa ao brand_slug
4. Se email já existe → associa a nova marca (multi-marca)
```

### Modelo de Roles para o Admin

| Role | Permissões |
|------|-----------|
| `user` | Acesso apenas à loja (pedidos próprios, perfil) |
| `admin` | Acesso ao painel admin das marcas associadas |
| `super_admin` | Acesso total a todas as marcas (considerar criar) |

### Verificação no Admin

```typescript
// Pseudocódigo para proteção de rotas admin
const canAccessAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
const canAccessBrand = (slug: string) => userBrands.some(ub => ub.brand_slug === slug);
```

---

## 7. Row Level Security (RLS)

### Políticas Atuais (Storefront — Leitura Pública)

| Tabela | Política | Condição |
|--------|----------|----------|
| `brands` | SELECT público | `active = true` |
| `products` | SELECT público | `active = true AND available_for_sale = true AND deleted_at IS NULL` |
| `product_images` | SELECT público | Produto associado ativo |
| `product_variants` | SELECT público | `stock > 0` e variante ativa |
| `collections` | SELECT público | `active = true` |
| `banners` | SELECT público | `active = true` e dentro do range de datas |
| `store_faqs` | SELECT público | `active = true` |
| `static_pages` | SELECT público | `active = true` |
| `footer_links` | SELECT público | `active = true` |
| `orders` | SELECT autenticado | `auth.uid() = user_id` (só os próprios) |
| `orders` | INSERT público | Qualquer um (guest checkout) |
| `order_items` | SELECT autenticado | Via join com orders do user |

### Políticas Necessárias para o Admin

> **ATENÇÃO:** Será necessário criar novas políticas RLS ou usar **service role key** para operações admin.

**Opção 1 — RLS com role check (recomendado):**
```sql
-- Exemplo: admin pode ler todos os produtos da sua marca
CREATE POLICY "admin_products_select" ON products
  FOR SELECT TO authenticated
  USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN user_brands ub ON ub.brand_slug = b.slug
      WHERE ub.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );

-- Exemplo: admin pode inserir/editar/deletar produtos da sua marca
CREATE POLICY "admin_products_insert" ON products
  FOR INSERT TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN user_brands ub ON ub.brand_slug = b.slug
      WHERE ub.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin')
    )
  );
```

**Opção 2 — Service Role Key (mais simples, menos seguro):**
```typescript
// Client admin com service_role key bypassa RLS
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
// NUNCA expor service_role no frontend!
// Usar apenas em Edge Functions ou API server
```

**Recomendação:** Usar **Opção 1** para a maioria das operações e **Opção 2** apenas para Edge Functions do lado do servidor.

---

## 8. Funções e Triggers do Banco

### Funções Existentes

| Função | Tipo | Descrição |
|--------|------|-----------|
| `generate_order_number()` | Trigger | Gera número do pedido por brand/ano via sequences PostgreSQL |
| `update_updated_at_column()` | Trigger | Atualiza `updated_at` em UPDATE |
| `increment_coupon_usage(coupon_id)` | RPC | Incrementa `usage_count` do cupom |
| `expire_stock_reservations()` | RPC | Marca reservas expiradas como 'expired' |
| `get_available_stock(product_id, variant_id)` | RPC | Retorna estoque disponível (stock - reservados) |
| `create_order_with_reservation()` | RPC | Cria pedido + reserva estoque atomicamente |
| `confirm_order_payment()` | RPC | Confirma pagamento e converte reservas |
| `cancel_order_and_release_stock()` | RPC | Cancela pedido e libera estoque reservado |
| `validate_brand_theme(theme)` | Validação | Valida estrutura do tema JSONB |
| `validate_brand_features(features)` | Validação | Valida estrutura de features JSONB |
| `validate_brand_settings(settings)` | Validação | Valida estrutura de settings JSONB |

### Formato do Order Number

```
{BRAND_SLUG_UPPER}-{ANO}-{SEQUENCIAL_4_DIGITOS}
Exemplo: SESH-2026-0001, GRUPOGOT-2026-0042
```

Cada marca tem sua própria sequence por ano, garantindo numeração independente e thread-safe.

---

## 9. Fluxos Críticos de Negócio

### 9.1 Fluxo de Pedido (Storefront → o que o Admin precisa visualizar/gerenciar)

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│   Carrinho   │───▶│   Checkout    │───▶│   Pagamento   │───▶│   Pedido     │
│  (Zustand)   │    │  (endereço +  │    │   (Asaas)     │    │  Confirmado  │
│              │    │   frete +     │    │              │    │             │
│              │    │   cupom)      │    │              │    │             │
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                   ┌──────────┐       ┌──────────┐       ┌──────────┐
                   │  pending  │       │   paid   │       │  failed  │
                   │(aguardando│       │(confirmado│       │(falhou)  │
                   │ pagamento)│       │ webhook)  │       │          │
                   └──────────┘       └──────────┘       └──────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                 ▼
                   ┌──────────┐     ┌──────────┐      ┌──────────┐
                   │processing│     │  shipped  │      │ delivered │
                   │(preparando│     │(enviado + │      │(entregue) │
                   │ envio)    │     │ tracking) │      │           │
                   └──────────┘     └──────────┘      └──────────┘
```

### Status do Pedido (para o Admin gerenciar)

| Campo | Valores | Quem altera |
|-------|---------|-------------|
| `status` | pending → paid → processing → shipped → delivered → cancelled | Admin (manual) + Webhook (pagamento) |
| `payment_status` | pending → paid → failed | Webhook Asaas (automático) |
| `fulfillment_status` | unfulfilled → processing → shipped → delivered | Admin (manual) |

### 9.2 Sistema de Reserva de Estoque

```
Criação do pedido:
  1. create_order_with_reservation() → cria reserva com TTL 15min
  2. reserved_stock da variante é incrementado
  3. get_available_stock() = stock - reserved_stock

Pagamento confirmado:
  4. confirm_order_payment() → status reserva = 'confirmed'
  5. stock é decrementado permanentemente
  6. reserved_stock é decrementado

Se pagamento não chega:
  7. expire_stock_reservations() → status = 'expired'
  8. reserved_stock é decrementado (estoque liberado)

Cancelamento:
  9. cancel_order_and_release_stock() → estoque liberado
```

### 9.3 Validação de Cupom

```
Regras de validação:
  ✓ Cupom existe e está ativo
  ✓ Pertence à marca correta (brand_id)
  ✓ Dentro do período valid_from / valid_until
  ✓ Não excedeu usage_limit
  ✓ Compra atinge minimum_purchase
  ✓ Desconto respeitando maximum_discount (para porcentagem)
  ✓ Tipo: 'percentage' aplica % | 'fixed' aplica valor fixo
```

---

## 10. Estrutura do Projeto Atual (Storefront)

```
sesh-store/
├── App.tsx                          ← Router principal + todas as páginas (149KB, monolítico)
├── index.tsx                        ← Entry point
├── constants.ts                     ← Dados mock
├── types.ts                         ← Interfaces TypeScript
├── tailwind.config.js
├── vite.config.ts                   ← Porta 3009
│
├── src/
│   ├── components/                  ← 29 componentes React
│   │   ├── ProductCard.tsx
│   │   ├── LoginModal.tsx
│   │   ├── ShippingCalculator.tsx
│   │   ├── CouponInput.tsx
│   │   ├── AgeVerificationPopup.tsx
│   │   ├── BrandLink.tsx            ← Navegação brand-aware
│   │   ├── UserMenu.tsx
│   │   ├── PriceDisplay.tsx
│   │   ├── VariantSelector.tsx
│   │   └── ...
│   │
│   ├── contexts/
│   │   ├── BrandContext.tsx          ← Detecção e estado da marca
│   │   ├── AuthContext.tsx           ← Autenticação + perfil + roles
│   │   └── SearchContext.tsx
│   │
│   ├── hooks/                       ← 13 custom hooks (React Query)
│   │   ├── useProducts.ts           ← CRUD de produtos + variantes
│   │   ├── useCategories.ts         ← Árvore hierárquica de categorias
│   │   ├── useOrders.ts             ← Pedidos por marca/usuário
│   │   ├── useCoupons.ts            ← Validação e aplicação
│   │   ├── useFAQs.ts               ← FAQs por marca/categoria
│   │   ├── useStaticPages.ts        ← Páginas dinâmicas
│   │   ├── useFooterLinks.ts        ← Links agrupados
│   │   ├── useBanners.ts            ← Banners com filtro de data
│   │   ├── useTheme.ts              ← Tema dinâmico + favicons
│   │   ├── useShipping.ts           ← Cálculo de frete (Frenet)
│   │   ├── useFuzzySearch.ts        ← Busca com Fuse.js
│   │   ├── useFeatureFlag.ts        ← Feature toggles por marca
│   │   └── useViaCep.ts             ← Consulta de CEP
│   │
│   ├── stores/
│   │   └── cartStore.ts             ← Zustand + localStorage persist
│   │
│   ├── lib/
│   │   ├── supabase.ts              ← Client Supabase
│   │   ├── brand-detection.ts       ← Lógica de detecção de marca
│   │   ├── queryClient.ts           ← Config React Query
│   │   ├── frenet.service.ts        ← Serviço de frete
│   │   ├── currency.utils.ts        ← Formatação monetária
│   │   ├── viaCep.ts
│   │   ├── stripe.ts
│   │   └── utils.ts
│   │
│   ├── config/
│   │   └── brands.ts                ← Configs locais das marcas (fallback)
│   │
│   └── types/
│       ├── coupon.ts
│       └── shipping.types.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 20260124_multi_tenant_foundation.sql    ← Schema principal
│   │   ├── 20260124_fix_generate_order_number.sql  ← Sequences
│   │   ├── 20260130_coupons_and_reservations.sql   ← Cupons + estoque
│   │   ├── 20260130_orders_enhancements.sql        ← Melhorias pedidos
│   │   └── 20260215_institutional_pages.sql        ← FAQs + páginas + footer
│   │
│   ├── functions/
│   │   └── calculate-shipping/                     ← Edge Function frete
│   │
│   └── seed.sql                                    ← Seeds das 3 marcas
│
├── public/
│   ├── logos/
│   └── favicons/
│
└── docs/
    └── setup/README.md
```

---

## 11. Variáveis de Ambiente

```bash
# ========================
# SUPABASE (obrigatório)
# ========================
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui

# Para o Admin, pode ser necessário (NÃO expor no frontend):
# SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key (apenas server-side / Edge Functions)

# ========================
# PAGAMENTO — ASAAS
# ========================
# Cada marca tem sua própria API key
VITE_ASAAS_API_KEY_SESH=sandbox-key-sesh
VITE_ASAAS_API_KEY_GRUPOGOT=sandbox-key-grupogot
VITE_ASAAS_API_KEY_THEOG=sandbox-key-theog
VITE_ASAAS_ENVIRONMENT=sandbox   # sandbox | production

# ========================
# FRETE — FRENET
# ========================
FRENET_API_TOKEN=seu-token-frenet
VITE_SELLER_CEP=24330286         # CEP de origem (Niterói, RJ)
VITE_BOX_HEIGHT=12
VITE_BOX_LENGTH=25
VITE_BOX_WIDTH=15
VITE_BOX_WEIGHT=0.8

# ========================
# APLICAÇÃO
# ========================
VITE_APP_URL=http://localhost:5173
VITE_VIACEP_URL=https://viacep.com.br/ws
```

---

## 12. Recomendações para o Painel Admin

### 12.1 Arquitetura Sugerida

```
sesh-admin/                     ← Projeto separado (mesmo repo ou novo)
├── Mesma stack:
│   ├── React + TypeScript + Vite
│   ├── Tailwind CSS
│   ├── TanStack React Query
│   ├── React Hook Form + Zod
│   └── Supabase Client (mesmo project)
│
├── Diferenças do storefront:
│   ├── React Router DOM (BrowserRouter, não Hash)
│   ├── Layout com sidebar de navegação
│   ├── Componentes de tabela/datagrid
│   ├── Upload de imagens (Supabase Storage)
│   └── Editor de conteúdo (rich text para static_pages)
```

### 12.2 Módulos Necessários

| Módulo | Tabelas Envolvidas | Operações |
|--------|-------------------|-----------|
| **Dashboard** | orders, products, order_items | Métricas, gráficos, KPIs |
| **Produtos** | products, product_images, product_variants | CRUD completo + upload de imagens |
| **Categorias** | categories | CRUD + drag-and-drop para reordenar |
| **Coleções** | collections, collection_products | CRUD + associação de produtos |
| **Pedidos** | orders, order_items, stock_reservations | Listagem, detalhes, mudança de status, tracking |
| **Cupons** | coupons, coupon_uses | CRUD + relatório de uso |
| **Banners** | banners | CRUD + upload + agendamento |
| **FAQs** | store_faqs | CRUD + categorização |
| **Páginas** | static_pages | CRUD + editor rich text |
| **Footer** | footer_links | CRUD + agrupamento |
| **Configurações** | brands | Editar tema, features, settings por marca |
| **Usuários** | users, user_brands | Listar admins, associar a marcas |

### 12.3 Brand Switcher (Componente Crítico)

```
┌──────────────────────────────────┐
│  🏪 Marca Ativa: Sesh Store  ▼  │   ← Dropdown no header/sidebar
├──────────────────────────────────┤
│  ○ Sesh Store                    │
│  ● Grupo GOT                    │
│  ○ The OG                       │
└──────────────────────────────────┘
```

Toda a aplicação admin deve reagir à mudança de marca:
- Queries React Query devem ter `brandId` na key
- Invalidar cache ao trocar de marca
- Exibir nome/logo da marca ativa no header

### 12.4 Padrões de Código Importantes

**Soft Delete:** Nunca usar `DELETE` em products, variants, collections, banners, coupons. Sempre `UPDATE SET deleted_at = now()`.

**Filtro de Marca:** Toda query deve incluir `WHERE brand_id = :currentBrandId`.

**Imagens:** Usar Supabase Storage para upload, guardar URL pública no campo `url`/`image_url`.

**Order Numbers:** Nunca gerar manualmente — são criados pelo trigger no INSERT.

**Estoque:** Ao editar estoque, lembrar que `reserved_stock` pode estar > 0. O estoque disponível real = `stock - reserved_stock`.

**JSONB Fields em `brands`:**
```json
// theme
{
  "primaryColor": "#41BAC2",
  "secondaryColor": "#333333",
  "backgroundColor": "#FFFFFF",
  "textColor": "#1a1a1a",
  "logo": "/logos/sesh-logo.svg",
  "favicon": "/favicons/sesh-favicon.svg",
  "font": "Inter"
}

// features
{
  "installments": true,
  "loyalty": false,
  "giftCards": false,
  "reviews": true
}

// settings
{
  "minOrderValue": 50.00,
  "freeShippingThreshold": 300.00,
  "maxInstallments": 12,
  "contact": {
    "email": "contato@seshstore.com.br",
    "phone": "(21) 99999-9999",
    "whatsapp": "5521999999999"
  },
  "social": {
    "instagram": "@seshstore",
    "facebook": "seshstore",
    "tiktok": "@seshstore"
  }
}
```

### 12.5 Dashboard — Métricas Sugeridas

| Métrica | Query |
|---------|-------|
| Total de pedidos (hoje/semana/mês) | `COUNT(orders) WHERE brand_id = X AND created_at >= ...` |
| Receita total | `SUM(orders.total) WHERE payment_status = 'paid'` |
| Ticket médio | `AVG(orders.total) WHERE payment_status = 'paid'` |
| Produtos ativos | `COUNT(products) WHERE active = true AND deleted_at IS NULL` |
| Estoque baixo | `product_variants WHERE stock - reserved_stock < 5` |
| Pedidos pendentes | `orders WHERE payment_status = 'pending'` |
| Top produtos | `order_items GROUP BY product_id ORDER BY SUM(quantity) DESC` |
| Cupons mais usados | `coupons ORDER BY usage_count DESC` |

---

## 13. Considerações de Segurança

### Regras Invioláveis

1. **Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.** Usar apenas em Edge Functions ou backend.

2. **Validar role no servidor.** Não confiar apenas em verificação client-side. As políticas RLS devem verificar `users.role` no PostgreSQL.

3. **Soft delete, não hard delete.** Preservar dados para auditoria e integridade referencial.

4. **Sanitizar input HTML** em `static_pages.content` — prevenir XSS se usar editor rich text.

5. **Rate limiting** em endpoints sensíveis (login, criação de pedido).

6. **Upload de imagens:** Validar tipo MIME, tamanho máximo, extensões permitidas. Usar Supabase Storage com bucket policies.

7. **Logs de auditoria:** Considerar criar tabela `audit_logs` para rastrear quem alterou o quê e quando (importante para multi-admin).

### Modelo de Auditoria Sugerido

```sql
-- Sugestão (não existe ainda — criar se necessário)
audit_logs (
  id          UUID PRIMARY KEY,
  brand_id    UUID REFERENCES brands(id),
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT,           -- 'create' | 'update' | 'delete'
  entity_type TEXT,           -- 'product' | 'order' | 'coupon' | ...
  entity_id   UUID,
  changes     JSONB,          -- {field: {old: X, new: Y}}
  created_at  TIMESTAMPTZ
)
```

---

## 14. Apêndice — Tabelas Completas

### Todas as Tabelas do Sistema

| Tabela | Multi-tenant | Soft Delete | Admin CRUD |
|--------|:----------:|:-----------:|:----------:|
| `brands` | N/A (é a raiz) | Não | Sim (super_admin) |
| `products` | Sim | Sim | Sim |
| `product_images` | Via product | Não | Sim |
| `product_variants` | Via product | Sim | Sim |
| `categories` | Sim | Sim | Sim |
| `collections` | Sim | Sim | Sim |
| `collection_products` | Via collection | Não | Sim |
| `orders` | Sim | Não | Leitura + update status |
| `order_items` | Sim (denorm.) | Não | Somente leitura |
| `coupons` | Sim | Sim | Sim |
| `coupon_uses` | Sim | Não | Somente leitura |
| `stock_reservations` | Sim | Não | Somente leitura |
| `store_faqs` | Sim | Não | Sim |
| `static_pages` | Sim | Não | Sim |
| `footer_links` | Sim | Não | Sim |
| `banners` | Sim | Sim | Sim |
| `users` | Global | Não | Sim (gestão admin) |
| `user_brands` | Global | Não | Sim (associações) |

### Índices Importantes (Já Criados)

```sql
-- Products
idx_products_brand            (brand_id)
idx_products_brand_active     (brand_id, active)
idx_products_brand_category   (brand_id, category)
idx_products_brand_featured   (brand_id, featured)
idx_products_slug             (slug)
idx_products_deleted          (deleted_at)
idx_products_tags             (tags) -- GIN

-- Orders
idx_orders_brand              (brand_id)
idx_orders_user               (user_id)
idx_orders_order_number       (order_number)
idx_orders_status             (status)
idx_orders_payment_status     (payment_status)
idx_orders_created_desc       (created_at DESC)
idx_orders_asaas_payment      (asaas_payment_id)
idx_orders_customer_cpf       (customer_cpf)
idx_orders_customer_email     (customer_email)

-- FAQs
idx_store_faqs_brand          (brand_id)
idx_store_faqs_brand_active   (brand_id, active)
idx_store_faqs_brand_category (brand_id, category)
```

---

> **Próximos passos para o desenvolvedor:**
> 1. Ler este documento inteiro e tirar dúvidas
> 2. Acessar o Supabase Dashboard para visualizar as tabelas e dados existentes
> 3. Definir se o admin será um projeto separado ou parte do monorepo
> 4. Implementar as RLS policies para role admin (Seção 7)
> 5. Começar pelo Brand Switcher + Dashboard, depois CRUD de produtos
> 6. Reaproveitar hooks existentes do storefront onde possível (adaptar para admin)
