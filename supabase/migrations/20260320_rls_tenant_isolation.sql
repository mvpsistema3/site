-- ============================================
-- RLS TENANT ISOLATION — Endurecimento de Segurança
-- Data: 2026-03-20
-- Contexto: MT-001 do plano de segurança para deploy
--
-- ARQUITETURA:
-- O frontend usa supabasePublic (anon key, sem JWT) para queries de catálogo.
-- Edge Functions usam service_role_key (bypass RLS).
-- Portanto:
--   - SELECT público para dados de catálogo: mantido (dados não-sensíveis)
--   - INSERT/UPDATE/DELETE: restringido para evitar escrita direta via anon key
--   - Helper functions criadas para uso futuro com Edge Functions
-- ============================================

-- ============================================
-- 1. HELPER: Extrair brand_id do contexto de sessão
-- ============================================
CREATE OR REPLACE FUNCTION auth.current_brand_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'brand_id')::uuid,
    (current_setting('app.current_brand_id', true))::uuid
  );
$$;

COMMENT ON FUNCTION auth.current_brand_id() IS 'Retorna brand_id do JWT ou da variável de sessão. Usado para RLS em operações autenticadas.';

-- ============================================
-- 2. HELPER: Setar brand_id no contexto de sessão
-- ============================================
CREATE OR REPLACE FUNCTION public.set_brand_context(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_brand_id', p_brand_id::text, true);
END;
$$;

COMMENT ON FUNCTION public.set_brand_context(uuid) IS 'Define o brand_id no contexto da sessão para RLS. Chamado por Edge Functions antes de operações de escrita.';

-- ============================================
-- 3. HABILITAR RLS EM TABELAS QUE FALTAM
-- ============================================
ALTER TABLE IF EXISTS store_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customer_brands ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLICIES PARA store_faqs
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'store_faqs' AND policyname = 'Public can read FAQs'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read FAQs" ON store_faqs FOR SELECT USING (true)';
  END IF;
END $$;

-- ============================================
-- 5. POLICIES PARA customer_profiles
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_profiles' AND policyname = 'Users can read own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own profile" ON customer_profiles FOR SELECT TO authenticated USING (id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON customer_profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON customer_profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid())';
  END IF;
END $$;

-- ============================================
-- 6. POLICIES PARA customer_brands
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_brands' AND policyname = 'Users can read own brand links'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own brand links" ON customer_brands FOR SELECT TO authenticated USING (user_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customer_brands' AND policyname = 'Users can insert own brand links'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own brand links" ON customer_brands FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================
-- 7. ENDURECER POLICIES — COUPONS
-- ============================================
-- Remover INSERT/UPDATE permissivos. Apenas service_role gerencia cupons.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Coupons are insertable by authenticated users" ON coupons;
  DROP POLICY IF EXISTS "Coupons are updatable by authenticated users" ON coupons;
END $$;

-- ============================================
-- 8. ENDURECER POLICIES — STOCK_RESERVATIONS
-- ============================================
-- Apenas service_role (via RPC create_order_with_reservation).
DO $$
BEGIN
  DROP POLICY IF EXISTS "Stock reservations are insertable by everyone" ON stock_reservations;
  DROP POLICY IF EXISTS "Stock reservations are updatable by everyone" ON stock_reservations;
  DROP POLICY IF EXISTS "Stock reservations are viewable by everyone" ON stock_reservations;
END $$;

CREATE POLICY "Users can read own stock reservations"
  ON stock_reservations FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- ============================================
-- 9. ENDURECER POLICIES — COUPON_USES
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Coupon uses are insertable by everyone" ON coupon_uses;
  DROP POLICY IF EXISTS "Coupon uses are viewable by everyone" ON coupon_uses;
END $$;

CREATE POLICY "Users can read own coupon uses"
  ON coupon_uses FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- ============================================
-- 10. ENDURECER POLICIES — ORDERS
-- ============================================
-- Guest checkout via Edge Function (service_role, bypass RLS).
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
  DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
END $$;

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND brand_id IS NOT NULL);

CREATE POLICY "Authenticated users can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );
