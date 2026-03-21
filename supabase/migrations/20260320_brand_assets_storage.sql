-- ============================================
-- STORAGE BUCKET: brand-assets
-- Data: 2026-03-20
-- Descrição: Bucket público para assets das marcas
--   (favicons, logos, banners, etc.)
-- ============================================

-- 1. Criar bucket público para assets de marca
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  5242880, -- 5MB max
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Política de leitura pública (qualquer um pode ver os assets)
CREATE POLICY "brand_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

-- 3. Política de upload apenas para admins autenticados
CREATE POLICY "brand_assets_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
  );

-- 4. Política de update apenas para admins autenticados
CREATE POLICY "brand_assets_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
  );

-- 5. Política de delete apenas para admins autenticados
CREATE POLICY "brand_assets_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-assets'
    AND auth.role() = 'authenticated'
  );

-- ============================================
-- 6. Atualizar favicons das brands para Storage URLs
-- Estrutura no bucket: brand-assets/favicons/{brand}.{ext}
-- URL pública: /storage/v1/object/public/brand-assets/favicons/{brand}.{ext}
-- ============================================

-- Sesh Store
UPDATE brands
SET theme = theme || jsonb_build_object(
  'favicon', '/storage/v1/object/public/brand-assets/favicons/sesh.ico',
  'favicons', jsonb_build_object(
    'ico',            '/storage/v1/object/public/brand-assets/favicons/sesh.ico',
    'svg',            '/storage/v1/object/public/brand-assets/favicons/sesh.svg',
    'png32',          '/storage/v1/object/public/brand-assets/favicons/sesh-32x32.png',
    'appleTouchIcon', '/storage/v1/object/public/brand-assets/favicons/sesh-180x180.png',
    'android192',     '/storage/v1/object/public/brand-assets/favicons/sesh-192x192.png',
    'android512',     '/storage/v1/object/public/brand-assets/favicons/sesh-512x512.png'
  )
)
WHERE slug = 'sesh';

-- Grupo GOT
UPDATE brands
SET theme = theme || jsonb_build_object(
  'favicon', '/storage/v1/object/public/brand-assets/favicons/grupogot.ico',
  'favicons', jsonb_build_object(
    'ico',            '/storage/v1/object/public/brand-assets/favicons/grupogot.ico',
    'svg',            '/storage/v1/object/public/brand-assets/favicons/grupogot.svg',
    'png32',          '/storage/v1/object/public/brand-assets/favicons/grupogot-32x32.png',
    'appleTouchIcon', '/storage/v1/object/public/brand-assets/favicons/grupogot-180x180.png',
    'android192',     '/storage/v1/object/public/brand-assets/favicons/grupogot-192x192.png',
    'android512',     '/storage/v1/object/public/brand-assets/favicons/grupogot-512x512.png'
  )
)
WHERE slug = 'grupogot';

-- The OG
UPDATE brands
SET theme = theme || jsonb_build_object(
  'favicon', '/storage/v1/object/public/brand-assets/favicons/theog.ico',
  'favicons', jsonb_build_object(
    'ico',            '/storage/v1/object/public/brand-assets/favicons/theog.ico',
    'svg',            '/storage/v1/object/public/brand-assets/favicons/theog.svg',
    'png32',          '/storage/v1/object/public/brand-assets/favicons/theog-32x32.png',
    'appleTouchIcon', '/storage/v1/object/public/brand-assets/favicons/theog-180x180.png',
    'android192',     '/storage/v1/object/public/brand-assets/favicons/theog-192x192.png',
    'android512',     '/storage/v1/object/public/brand-assets/favicons/theog-512x512.png'
  )
)
WHERE slug = 'theog';

-- Atualizar também o default para novas brands
ALTER TABLE brands
  ALTER COLUMN theme SET DEFAULT '{
    "primaryColor": "#00FFFF",
    "secondaryColor": "#000000",
    "backgroundColor": "#FFFFFF",
    "textColor": "#000000",
    "logo": "/logos/default.svg",
    "favicon": "/storage/v1/object/public/brand-assets/favicons/default.ico",
    "font": "Inter"
  }'::jsonb;

COMMENT ON COLUMN brands.theme IS 'Configurações visuais (cores, logo, fonte). Favicons apontam para Supabase Storage bucket brand-assets.';
