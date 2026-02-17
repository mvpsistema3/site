-- ============================================
-- SEED DATA - 3 Marcas Iniciais
-- ============================================
-- Data: 2026-01-24
-- Marcas: Sesh Store, Grupo GOT, The OG
-- ============================================

INSERT INTO brands (slug, name, domain, theme, features, settings)
VALUES
  -- 🟦 MARCA 1: Sesh Store (Streetwear)
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
    }'::jsonb
  ),

  -- 🟧 MARCA 2: Grupo GOT
  (
    'grupogot',
    'Grupo GOT',
    'grupogot.com',
    '{
      "primaryColor": "#FF6B00",
      "secondaryColor": "#FFFFFF",
      "backgroundColor": "#FAFAFA",
      "textColor": "#333333",
      "logo": "/logos/grupogot.svg",
      "favicon": "/favicons/grupogot.ico",
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
    }'::jsonb
  ),

  -- 🟩 MARCA 3: The OG
  (
    'theog',
    'The OG',
    'theog.com.br',
    '{
      "primaryColor": "#00FF00",
      "secondaryColor": "#000000",
      "backgroundColor": "#FFFFFF",
      "textColor": "#2D2D2D",
      "logo": "/logos/theog.svg",
      "favicon": "/favicons/theog.ico",
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
    }'::jsonb
  );

-- ============================================
-- Validar Inserção
-- ============================================
-- Execute esta query após o INSERT para verificar:
-- SELECT slug, name, domain, active FROM brands;
-- Deve retornar exatamente 3 marcas

-- ============================================
-- Produtos de Exemplo (Opcional)
-- ============================================
-- Descomente para inserir produtos de teste

-- SESH PRODUCTS
/*
DO $$
DECLARE
  sesh_id UUID;
BEGIN
  -- Pegar ID da marca Sesh
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';

  -- Inserir produtos
  INSERT INTO products (brand_id, name, slug, description, price, category, featured, tags)
  VALUES
    (sesh_id, 'Camiseta Sesh Preta', 'camiseta-sesh-preta', 'Camiseta streetwear 100% algodão', 89.90, 'camisetas', true, ARRAY['streetwear', 'básico']),
    (sesh_id, 'Moletom Sesh Cyan', 'moletom-sesh-cyan', 'Moletom com capuz estampa exclusiva', 189.90, 'moletons', true, ARRAY['streetwear', 'inverno']),
    (sesh_id, 'Boné Sesh Snapback', 'bone-sesh-snapback', 'Boné ajustável logo bordado', 69.90, 'acessorios', false, ARRAY['acessório', 'streetwear']);
END $$;
*/

-- GRUPO GOT PRODUCTS
/*
DO $$
DECLARE
  got_id UUID;
BEGIN
  SELECT id INTO got_id FROM brands WHERE slug = 'grupogot';

  INSERT INTO products (brand_id, name, slug, description, price, category, featured, tags)
  VALUES
    (got_id, 'Camiseta GOT Laranja', 'camiseta-got-laranja', 'Camiseta premium laranja', 99.90, 'camisetas', true, ARRAY['casual', 'premium']),
    (got_id, 'Jaqueta GOT', 'jaqueta-got', 'Jaqueta corta-vento', 249.90, 'jaquetas', true, ARRAY['casual', 'inverno']);
END $$;
*/

-- THE OG PRODUCTS
/*
DO $$
DECLARE
  og_id UUID;
BEGIN
  SELECT id INTO og_id FROM brands WHERE slug = 'theog';

  INSERT INTO products (brand_id, name, slug, description, price, category, featured, tags)
  VALUES
    (og_id, 'Camiseta OG Verde', 'camiseta-og-verde', 'Camiseta verde sustentável', 79.90, 'camisetas', true, ARRAY['eco', 'básico']),
    (og_id, 'Shorts OG', 'shorts-og', 'Shorts esportivo', 119.90, 'shorts', false, ARRAY['esporte', 'verão']);
END $$;
*/

-- ============================================
-- ✅ SEED COMPLETO!
-- ============================================
