# 🔧 Plano de Ação - Correção da Função generate_order_number()

**Data:** 2026-01-23
**Prioridade:** CRÍTICA (P0)
**Status:** Pendente

---

## 🎯 Problema Identificado

**Erro:** `FOR UPDATE is not allowed with aggregate functions`
**Localização:** `supabase/migrations/20260124_multi_tenant_foundation.sql:481`
**Função afetada:** `generate_order_number()`
**Impacto:** Sistema de pedidos completamente bloqueado

### Causa Raiz

O PostgreSQL **não permite** usar `FOR UPDATE` (row-level lock) em queries com funções agregadas como `MAX()`, `SUM()`, `COUNT()`, etc.

**Código problemático (linha 474-481):**
```sql
SELECT COALESCE(
  MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)),
  0
) INTO last_number
FROM orders
WHERE brand_id = NEW.brand_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
FOR UPDATE;  -- ❌ ERRO: Não pode usar FOR UPDATE com MAX()
```

---

## ✅ Solução Proposta

Existem **3 abordagens** possíveis. Recomendo a **Solução 1** (mais simples e eficiente).

### Solução 1: Usar Sequences do PostgreSQL (RECOMENDADA) ⭐

**Vantagens:**
- Nativa do PostgreSQL
- Thread-safe por design
- Alta performance
- Sem race conditions
- Código mais limpo

**Implementação:**

```sql
-- 1. Criar sequence para cada marca/ano
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  brand_slug TEXT;
  year_part TEXT;
  sequence_name TEXT;
  next_number INTEGER;
  new_order_number TEXT;
BEGIN
  -- Pegar slug da marca
  SELECT slug INTO brand_slug
  FROM brands
  WHERE id = NEW.brand_id;

  -- Ano atual
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Nome da sequence: order_seq_sesh_2026
  sequence_name := 'order_seq_' || brand_slug || '_' || year_part;

  -- Criar sequence se não existir (dinâmico)
  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS %I START 1',
    sequence_name
  );

  -- Obter próximo número da sequence
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;

  -- Montar número do pedido (ex: SESH-2026-0001)
  new_order_number := UPPER(brand_slug) || '-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');

  NEW.order_number := new_order_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Observações:**
- Sequences são criadas automaticamente conforme necessário
- Cada marca/ano tem sua própria sequence
- Números nunca se repetem (mesmo com rollback)
- Pode haver "buracos" na numeração se houver rollbacks

---

### Solução 2: Tabela de Contadores com Advisory Locks

**Vantagens:**
- Controle total sobre numeração
- Pode resetar contadores manualmente
- Sem "buracos" na numeração

**Desvantagens:**
- Mais complexa
- Requer tabela adicional
- Mais lenta que sequences

**Implementação:**

```sql
-- 1. Criar tabela de contadores
CREATE TABLE order_counters (
  brand_id UUID NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0,
  PRIMARY KEY (brand_id, year)
);

-- 2. Reescrever função
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  brand_slug TEXT;
  year_part TEXT;
  current_year INTEGER;
  next_number INTEGER;
  new_order_number TEXT;
BEGIN
  -- Pegar slug da marca
  SELECT slug INTO brand_slug
  FROM brands
  WHERE id = NEW.brand_id;

  -- Ano atual
  current_year := EXTRACT(YEAR FROM NOW());
  year_part := current_year::TEXT;

  -- Usar advisory lock para evitar race condition
  PERFORM pg_advisory_xact_lock(
    hashtext(NEW.brand_id::TEXT || current_year::TEXT)
  );

  -- Inserir ou atualizar contador
  INSERT INTO order_counters (brand_id, year, last_number)
  VALUES (NEW.brand_id, current_year, 1)
  ON CONFLICT (brand_id, year)
  DO UPDATE SET last_number = order_counters.last_number + 1
  RETURNING last_number INTO next_number;

  -- Montar número do pedido
  new_order_number := UPPER(brand_slug) || '-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');

  NEW.order_number := new_order_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### Solução 3: Remover Lock (NÃO RECOMENDADA) ⚠️

Simplesmente remover o `FOR UPDATE` da query atual.

**Desvantagens:**
- **Race condition:** Pedidos simultâneos podem gerar números duplicados
- Não recomendada para produção

**Código:**
```sql
-- Apenas remover o FOR UPDATE (linha 481)
SELECT COALESCE(
  MAX(CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)),
  0
) INTO last_number
FROM orders
WHERE brand_id = NEW.brand_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
-- FOR UPDATE removido
```

---

## 📋 Passos para Implementação (Solução 1)

### Passo 1: Criar Migration de Correção

```bash
# Criar novo arquivo de migration
# Nome: supabase/migrations/20260124_fix_generate_order_number.sql
```

### Passo 2: Aplicar Migration

```sql
-- No Supabase Dashboard > SQL Editor
-- Copiar e executar o conteúdo da migration de correção
```

### Passo 3: Testar

```sql
-- Teste 1: Criar primeiro pedido
DO $$
DECLARE
  sesh_id UUID;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';

  INSERT INTO orders (
    brand_id, customer_name, customer_email, customer_phone, customer_cpf,
    shipping_address, subtotal, shipping_cost, total, payment_method
  )
  VALUES (
    sesh_id, 'Teste 1', 'teste1@email.com', '11999999999', '12345678900',
    '{"cep": "01000-000"}'::jsonb, 100.00, 15.00, 115.00, 'pix'
  );
END $$;

-- Verificar número gerado
SELECT order_number FROM orders WHERE customer_name = 'Teste 1';
-- Esperado: SESH-2026-0001
```

```sql
-- Teste 2: Criar 3 pedidos simultâneos
DO $$
DECLARE
  sesh_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';

  FOR i IN 2..4 LOOP
    INSERT INTO orders (
      brand_id, customer_name, customer_email, customer_phone, customer_cpf,
      shipping_address, subtotal, shipping_cost, total, payment_method
    )
    VALUES (
      sesh_id, 'Teste ' || i, 'teste' || i || '@email.com',
      '11999999999', '12345678900',
      '{"cep": "01000-000"}'::jsonb, 100.00, 15.00, 115.00, 'pix'
    );
  END LOOP;
END $$;

-- Verificar sequência
SELECT order_number, customer_name
FROM orders
WHERE customer_name LIKE 'Teste%'
ORDER BY order_number;
-- Esperado: 0001, 0002, 0003, 0004
```

### Passo 4: Limpar Testes

```sql
DELETE FROM orders WHERE customer_name LIKE 'Teste%';
```

---

## 🚀 Próximas Ações

1. ✅ **Problema identificado e documentado**
2. ⬜ **Criar migration de correção** (`20260124_fix_generate_order_number.sql`)
3. ⬜ **Aplicar migration no Supabase**
4. ⬜ **Executar testes de validação**
5. ⬜ **Limpar dados de teste**
6. ⬜ **Marcar como resolvido**

---

## 📊 Status Atual do Sistema

| Componente | Status | Observações |
|------------|--------|-------------|
| Brands | ✅ Funcional | 3 marcas ativas |
| Products | ✅ Funcional | CRUD + soft delete OK |
| Orders | 🔴 **BLOQUEADO** | Aguardando correção |
| Order Items | 🔴 **BLOQUEADO** | Depende de Orders |
| Collections | ⚠️ Não testado | Estrutura OK |
| Banners | ⚠️ Não testado | Estrutura OK |

---

## ⏱️ Estimativa de Tempo

- **Criar migration:** 10 minutos
- **Aplicar + testar:** 15 minutos
- **Total:** ~25 minutos

---

## 🔗 Referências

- [PostgreSQL Sequences](https://www.postgresql.org/docs/current/sql-createsequence.html)
- [Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
- [Row-Level Locking](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)
