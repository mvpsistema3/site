-- =====================================================
-- Migration: Fix generate_order_number() Function
-- Data: 2026-01-24
-- Descrição: Corrige erro "FOR UPDATE is not allowed with aggregate functions"
--           usando PostgreSQL Sequences ao invés de MAX() com lock
-- =====================================================

-- Remover a função antiga (com problema)
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;

-- Criar nova função usando Sequences (thread-safe)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  brand_slug TEXT;
  year_part TEXT;
  sequence_name TEXT;
  next_number INTEGER;
  new_order_number TEXT;
BEGIN
  -- Validar que brand_id existe
  IF NEW.brand_id IS NULL THEN
    RAISE EXCEPTION 'brand_id cannot be null';
  END IF;

  -- Pegar slug da marca
  SELECT slug INTO brand_slug
  FROM brands
  WHERE id = NEW.brand_id;

  -- Validar que a marca existe
  IF brand_slug IS NULL THEN
    RAISE EXCEPTION 'Brand not found for id: %', NEW.brand_id;
  END IF;

  -- Ano atual
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Nome da sequence: order_seq_sesh_2026
  sequence_name := 'order_seq_' || brand_slug || '_' || year_part;

  -- Criar sequence se não existir (dinâmico)
  -- Nota: IF NOT EXISTS garante que não haverá erro se já existir
  EXECUTE format(
    'CREATE SEQUENCE IF NOT EXISTS %I START 1',
    sequence_name
  );

  -- Obter próximo número da sequence
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;

  -- Montar número do pedido (ex: SESH-2026-0001)
  new_order_number := UPPER(brand_slug) || '-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');

  -- Atribuir ao novo registro
  NEW.order_number := new_order_number;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro para debugging
    RAISE WARNING 'Error in generate_order_number: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger (caso tenha sido removido ao dropar a função)
DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- Comentários e Observações
-- =====================================================
--
-- VANTAGENS desta abordagem:
-- ✅ Thread-safe por design (Sequences são atômicas)
-- ✅ Alta performance
-- ✅ Sem race conditions
-- ✅ Código mais limpo e simples
-- ✅ Nativo do PostgreSQL
--
-- OBSERVAÇÕES:
-- ⚠️ Sequences podem ter "buracos" na numeração em caso de rollback
--    (ex: 0001, 0002, 0005) - isso é normal e esperado
-- ⚠️ Cada marca/ano tem sua própria sequence
-- ⚠️ Sequences não são resetadas automaticamente no novo ano
--    (uma nova sequence é criada automaticamente)
--
-- EXEMPLOS de números gerados:
-- - SESH-2026-0001
-- - SESH-2026-0002
-- - HAOMA-2026-0001
-- - DYAD-2026-0001
-- - SESH-2027-0001 (nova sequence no próximo ano)
-- =====================================================
