# 🗄️ Database Setup - Multi-Tenant E-commerce

## 📋 Instruções de Execução

### 1️⃣ Executar Migration no Supabase

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Navegue para **SQL Editor** (ícone de código no menu lateral)
4. Clique em **New query**
5. Copie todo o conteúdo de `migrations/20260124_multi_tenant_foundation.sql`
6. Cole no editor e clique em **Run** (ou pressione `Ctrl + Enter`)

**Aguarde a execução** (pode levar 10-15 segundos).

### 2️⃣ Inserir Marcas Iniciais (Seed)

1. No mesmo SQL Editor, abra uma nova aba
2. Copie todo o conteúdo de `seed.sql`
3. Cole no editor e clique em **Run**

**Validar:** Execute a query abaixo para confirmar:
```sql
SELECT slug, name, domain, active FROM brands;
```

Deve retornar **3 marcas**:
- `sesh` - Sesh Store
- `grupogot` - Grupo GOT
- `theog` - The OG

---

## 🔍 Validações Pós-Migração

### Verificar Tabelas Criadas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'brands', 'products', 'product_images',
  'product_variants', 'collections', 'collection_products',
  'orders', 'order_items', 'banners'
);
```

**Esperado:** 9 tabelas listadas.

### Verificar RLS Ativo

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

**Esperado:** Todas as tabelas com `rowsecurity = true`.

### Verificar Funções Criadas

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_updated_at_column',
  'generate_order_number',
  'validate_brand_theme',
  'validate_brand_features',
  'validate_brand_settings'
);
```

**Esperado:** 5 funções listadas.

### Verificar Índices

```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'products';
```

**Esperado:** Múltiplos índices incluindo:
- `idx_products_brand`
- `idx_products_deleted`
- `idx_products_tags` (GIN index)

---

## 🧪 Testes Rápidos

### Teste 1: Inserir Produto de Teste

```sql
-- Pegar ID da marca Sesh
DO $$
DECLARE
  sesh_id UUID;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';

  INSERT INTO products (brand_id, name, slug, description, price, category, tags)
  VALUES (
    6b3e706e-fb7b-4845-9208-422d49c0a512,
    'Camiseta Teste',
    'camiseta-teste',
    'Produto de teste',
    99.90,
    'camisetas',
    ARRAY['teste', 'streetwear']
  );
END $$;

-- Verificar se foi inserido
SELECT name, slug, price, brand_id FROM products;
```

### Teste 2: Soft Delete

```sql
-- "Deletar" o produto (soft delete)
UPDATE products
SET deleted_at = NOW()
WHERE slug = 'camiseta-teste';

-- Verificar que está marcado como deletado
SELECT name, slug, deleted_at
FROM products
WHERE slug = 'camiseta-teste';

-- Limpar teste
DELETE FROM products WHERE slug = 'camiseta-teste';
```

### Teste 3: Gerar Order Number

```sql
-- Criar pedido de teste
DO $$
DECLARE
  sesh_id UUID;
  test_order_id UUID;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';

  INSERT INTO orders (
    brand_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    shipping_address,
    subtotal,
    shipping_cost,
    total,
    payment_method
  )
  VALUES (
    sesh_id,
    'Cliente Teste',
    'teste@email.com',
    '11999999999',
    '12345678900',
    '{"cep": "01000-000", "rua": "Rua Teste", "numero": "123"}'::jsonb,
    100.00,
    15.00,
    115.00,
    'pix'
  )
  RETURNING id INTO test_order_id;

  -- Mostrar order_number gerado
  SELECT order_number, created_at FROM orders WHERE id = test_order_id;
END $$;
```

**Esperado:** Order number no formato `SESH-2026-0001`.

### Teste 4: Race Condition (Pedidos Simultâneos)

```sql
-- Criar 3 pedidos seguidos
DO $$
DECLARE
  sesh_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';

  FOR i IN 1..3 LOOP
    INSERT INTO orders (
      brand_id, customer_name, customer_email, customer_phone, customer_cpf,
      shipping_address, subtotal, shipping_cost, total, payment_method
    )
    VALUES (
      sesh_id, 'Teste ' || i, 'teste' || i || '@email.com',
      '11999999999', '12345678900',
      '{"cep": "01000-000"}'::jsonb,
      100.00, 15.00, 115.00, 'pix'
    );
  END LOOP;
END $$;

-- Verificar que não há duplicação
SELECT order_number, created_at
FROM orders
WHERE order_number LIKE 'SESH-2026-%'
ORDER BY order_number;
```

**Esperado:** Números sequenciais sem duplicação (0001, 0002, 0003...).

---

## 🗑️ Limpar Dados de Teste

```sql
-- Remover pedidos de teste
DELETE FROM orders WHERE customer_name LIKE 'Teste%' OR customer_name = 'Cliente Teste';

-- Remover produtos de teste
DELETE FROM products WHERE name LIKE '%Teste%';

-- Verificar limpeza
SELECT COUNT(*) FROM orders; -- Deve retornar 0
SELECT COUNT(*) FROM products; -- Deve retornar 0
```

---

## 🛠️ Troubleshooting

### Erro: "function update_updated_at_column() does not exist"

**Solução:** Execute novamente a seção do SQL que cria a função (linhas 1-13 da migration).

### Erro: "relation 'brands' already exists"

**Solução:** A migration já foi executada. Para resetar:

```sql
-- ⚠️ CUIDADO: Isso apaga TODOS os dados!
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS collection_products CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS banners CASCADE;
DROP TABLE IF EXISTS brands CASCADE;

DROP FUNCTION IF EXISTS generate_order_number CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS validate_brand_theme CASCADE;
DROP FUNCTION IF EXISTS validate_brand_features CASCADE;
DROP FUNCTION IF EXISTS validate_brand_settings CASCADE;

DROP VIEW IF EXISTS products_with_brand CASCADE;
```

Depois execute a migration novamente.

### Erro: "permission denied for table brands"

**Solução:** Você está usando a `anon key`. Use a `service_role` key para operações de admin.

---

## 📊 Estrutura Final

```
✅ 9 Tabelas criadas
✅ 5 Funções helper
✅ 1 View (products_with_brand)
✅ RLS ativo em todas as tabelas
✅ Políticas de acesso configuradas
✅ Índices otimizados
✅ Soft delete implementado
✅ Race condition corrigida
✅ 3 Marcas inseridas (seed)
```

---

## 🎯 Próximos Passos

1. ✅ **Database Setup** (você está aqui!)
2. ⬜ Configurar Frontend (criar arquivos de código)
3. ⬜ Integrar Asaas (gateway de pagamento)
4. ⬜ Deploy (Vercel + domínios)

---

## 📚 Referências

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Multi-Tenancy**: https://www.citusdata.com/blog/2016/10/03/designing-your-saas-database-for-high-scalability/
