# ✅ FASE 1 COMPLETA - Fundação do Banco de Dados

**Data:** 24 de Janeiro de 2026
**Status:** Pronto para execução no Supabase
**Duração Estimada de Execução:** 5-10 minutos

---

## 📦 Arquivos Criados

```
supabase/
├── migrations/
│   └── 20260124_multi_tenant_foundation.sql   ✅ Migration completa (16 seções)
├── seed.sql                                    ✅ 3 marcas iniciais
└── README.md                                   ✅ Documentação completa

.env.local.example                              ✅ Variáveis de ambiente atualizadas
```

---

## 🎯 O que foi Implementado

### ✅ Correções Aplicadas (vs. versão original)

1. **Removido `brand_id` Redundante**
   - ❌ Removido de: `product_images`, `product_variants`, `collection_products`
   - ✅ Mantido em: `order_items` (para relatórios diretos)

2. **Race Condition Corrigida**
   - ✅ `generate_order_number()` agora usa `FOR UPDATE` (lock de linha)
   - Pedidos simultâneos NÃO geram números duplicados

3. **API Keys Asaas Fora do Banco**
   - ✅ Removidas colunas `asaas_api_key` e `asaas_wallet_id` da tabela `brands`
   - ✅ Configuração via variáveis de ambiente (`.env.local`)
   - ✅ Uma API key por marca: `VITE_ASAAS_API_KEY_SESH`, `_GRUPOGOT`, `_THEOG`

4. **Soft Delete Implementado**
   - ✅ Coluna `deleted_at` adicionada em:
     - `products`
     - `product_variants`
     - `collections`
     - `banners`
   - Histórico preservado, auditoria melhorada

5. **SKU Único Global**
   - ✅ Constraint `UNIQUE(sku)` aplicada (padrão e-commerce)
   - Facilita logística e rastreamento

6. **Índices Otimizados**
   - ✅ GIN index para `tags` (busca por array)
   - ✅ Índices para `customer_cpf`, `customer_email`, `payment_method`
   - ✅ Índices para soft delete (`deleted_at`)

7. **RLS Simplificado**
   - ✅ Admin usa `service_role` key (bypassa RLS)
   - ✅ Frontend público usa `anon` key (com RLS ativo)
   - Policies simples e eficientes

8. **View Helper**
   - ✅ `products_with_brand` criada
   - Facilita queries que precisam de info da marca
   - Evita JOINs repetitivos no código

9. **Validação JSONB**
   - ✅ Funções de validação para `theme`, `features`, `settings`
   - Garante integridade dos dados JSON

---

## 🗄️ Estrutura do Banco

### Tabelas Criadas (9)

1. **`brands`** - Tabela central multi-tenant
2. **`products`** - Produtos por marca (com soft delete)
3. **`product_images`** - Imagens dos produtos (sem `brand_id`)
4. **`product_variants`** - Variações (cor/tamanho/estoque, SKU global)
5. **`collections`** - Coleções/Landing pages
6. **`collection_products`** - Relação N:N
7. **`orders`** - Pedidos com integração Asaas
8. **`order_items`** - Itens dos pedidos (mantém `brand_id`)
9. **`banners`** - Banners promocionais

### Funções Criadas (5)

1. **`update_updated_at_column()`** - Atualiza `updated_at` automaticamente
2. **`generate_order_number()`** - Gera número único de pedido (COM LOCK)
3. **`validate_brand_theme()`** - Valida JSON de tema
4. **`validate_brand_features()`** - Valida JSON de features
5. **`validate_brand_settings()`** - Valida JSON de settings

### Views (1)

1. **`products_with_brand`** - Produtos com info da marca (facilita queries)

### RLS & Policies

- ✅ RLS ativo em todas as 9 tabelas
- ✅ Policies públicas para SELECT (produtos, collections, banners)
- ✅ Policies privadas para ORDERS (usuário vê apenas seus pedidos)
- ✅ Policies de INSERT para checkout (guest checkout permitido)

---

## 📋 Próximos Passos

### 1️⃣ AGORA - Executar no Supabase

**Tempo:** 5-10 minutos

1. Acesse: https://supabase.com/dashboard
2. SQL Editor → New query
3. Copie `supabase/migrations/20260124_multi_tenant_foundation.sql`
4. Execute (`Ctrl + Enter`)
5. Copie `supabase/seed.sql`
6. Execute novamente
7. **Validar:** `SELECT slug, name FROM brands;` → Deve retornar 3 marcas

### 2️⃣ DEPOIS - Configurar Frontend

**Tempo:** 2-3 horas

Arquivos a criar:
- `src/config/brands.ts` - Configurações das 3 marcas
- `src/lib/brand-detection.ts` - Detectar marca pelo domínio
- `src/contexts/BrandContext.tsx` - Context da marca atual
- `src/hooks/useProducts.ts` - Hook com filtro `brand_id` (modificar)
- `src/hooks/useCollections.ts` - Novo hook
- `src/hooks/useBanners.ts` - Novo hook

### 3️⃣ INTEGRAÇÃO ASAAS

**Tempo:** 4-6 horas

- Criar contas no Asaas Sandbox (3 marcas)
- Obter API keys
- Configurar `.env.local`
- Criar `src/lib/asaas.ts`
- Criar `src/hooks/useCheckout.ts`

### 4️⃣ DEPLOY

**Tempo:** 2-3 horas

- Deploy no Vercel
- Configurar 3 domínios
- DNS (CNAME records)
- Variáveis de ambiente no Vercel
- Asaas: Sandbox → Production

---

## 🧪 Como Testar (Após Execução)

### Teste 1: Verificar Marcas

```sql
SELECT slug, name, domain, active FROM brands;
```

**Esperado:** 3 marcas listadas.

### Teste 2: Criar Produto de Teste

```sql
DO $$
DECLARE sesh_id UUID;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';
  INSERT INTO products (brand_id, name, slug, description, price, category, tags)
  VALUES (sesh_id, 'Teste', 'teste', 'Produto teste', 99.90, 'camisetas', ARRAY['teste']);
END $$;

SELECT name, price, brand_id FROM products;
```

### Teste 3: Soft Delete

```sql
UPDATE products SET deleted_at = NOW() WHERE slug = 'teste';
SELECT name, deleted_at FROM products WHERE slug = 'teste';
```

### Teste 4: Gerar Order Number

```sql
DO $$
DECLARE sesh_id UUID;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';
  INSERT INTO orders (brand_id, customer_name, customer_email, customer_phone, customer_cpf, shipping_address, subtotal, shipping_cost, total, payment_method)
  VALUES (sesh_id, 'Teste', 'teste@email.com', '11999999999', '12345678900', '{"cep": "01000-000"}'::jsonb, 100, 15, 115, 'pix');
END $$;

SELECT order_number, created_at FROM orders ORDER BY created_at DESC LIMIT 1;
```

**Esperado:** `SESH-2026-0001` (ou sequencial).

---

## 📊 Métricas de Sucesso

| Métrica | Status |
|---------|--------|
| **9 tabelas criadas** | ✅ Pronto |
| **5 funções helper** | ✅ Pronto |
| **1 view helper** | ✅ Pronto |
| **RLS ativo** | ✅ Pronto |
| **Policies configuradas** | ✅ Pronto |
| **Soft delete** | ✅ Implementado |
| **Race condition** | ✅ Corrigida |
| **API keys fora do banco** | ✅ Variáveis de ambiente |
| **SKU global** | ✅ Unique constraint |
| **Índices otimizados** | ✅ GIN + performance |

---

## 🎉 Resultado

### Antes (Versão Original)
- ❌ brand_id redundante em 3 tabelas
- ❌ Race condition em order_number
- ❌ API keys expostas no banco
- ❌ Sem soft delete
- ❌ SKU não era único globalmente
- ❌ Faltavam índices importantes

### Depois (Versão Corrigida)
- ✅ brand_id apenas onde necessário
- ✅ Race condition corrigida (FOR UPDATE)
- ✅ API keys em variáveis de ambiente
- ✅ Soft delete implementado
- ✅ SKU único globalmente
- ✅ Índices otimizados (GIN, CPF, email)

---

## 📚 Documentação

- **Migration SQL:** `supabase/migrations/20260124_multi_tenant_foundation.sql`
- **Seed SQL:** `supabase/seed.sql`
- **Instruções Completas:** `supabase/README.md`
- **Variáveis de Ambiente:** `.env.local.example`

---

## 💡 Dicas

1. **Use `service_role` key para admin:** Bypassa RLS completamente
2. **Use `anon` key no frontend:** Garante que RLS está ativo
3. **Soft delete preserva histórico:** Produtos "deletados" ainda aparecem em pedidos antigos
4. **Cache `brand_id`:** No frontend, cache o UUID para evitar queries repetidas
5. **Teste race condition:** Crie pedidos simultâneos e verifique que não há duplicação

---

## 🆘 Suporte

**Problemas?** Veja `supabase/README.md` seção "Troubleshooting"

**Erros comuns:**
- `function does not exist` → Execute seção de funções novamente
- `relation already exists` → Migration já foi executada (ver reset no README)
- `permission denied` → Usando anon key? Troque para service_role

---

**🎯 Próximo Passo:** Execute a migration no Supabase SQL Editor!
