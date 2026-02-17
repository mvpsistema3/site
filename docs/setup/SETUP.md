# Setup Guide - Sesh Store

## Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase (https://supabase.com)
- Conta Stripe (https://stripe.com)

## Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

### 3. Configurar Supabase

1. Crie um projeto no Supabase (https://app.supabase.com)
2. Copie a URL e a chave anônima do projeto
3. Cole no arquivo `.env.local`

### 4. Criar tabelas no Supabase

Execute o seguinte SQL no Supabase SQL Editor:

```sql
-- Table: products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  stock INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  discount INTEGER,
  rating DECIMAL(2,1) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address JSONB NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: banners
CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  active BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Policies: Products (public read)
CREATE POLICY "Products are viewable by everyone"
ON products FOR SELECT
USING (active = true);

-- Policies: Orders (users can only see their own)
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policies: Banners (public read)
CREATE POLICY "Banners are viewable by everyone"
ON banners FOR SELECT
USING (active = true);

-- Policies: Collections (public read)
CREATE POLICY "Collections are viewable by everyone"
ON collections FOR SELECT
USING (active = true);
```

### 5. Configurar Stripe

1. Obtenha sua chave publicável no dashboard do Stripe
2. Adicione ao `.env.local`

### 6. Storage no Supabase (para imagens)

1. Vá em Storage no Supabase
2. Crie um bucket chamado `product-images`
3. Configure como público

## Desenvolvimento

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no navegador.

## Build para produção

```bash
npm run build
```

## Próximos Passos

- [ ] Configurar autenticação de usuários
- [ ] Integrar webhook do Stripe para processamento de pagamentos
- [ ] Adicionar painel administrativo para gerenciar produtos
- [ ] Configurar envio de emails (Resend ou similar)
- [ ] Adicionar tracking de pedidos
- [ ] Implementar sistema de avaliações

## Stack Tecnológica

- **Frontend**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Server State**: React Query
- **Forms**: React Hook Form + Zod
- **Payments**: Stripe
- **Routing**: React Router v7

## Estrutura de Pastas

```
sesh-store/
├── src/
│   ├── lib/          # Configurações e utilities
│   ├── hooks/        # Custom React hooks
│   ├── stores/       # Zustand stores
│   ├── components/   # Componentes reutilizáveis (futuro)
│   └── pages/        # Páginas (futuro)
├── App.tsx           # Componente principal
├── index.tsx         # Entry point
└── index.css         # Estilos globais
```

## Suporte

Para dúvidas, abra uma issue no repositório.
