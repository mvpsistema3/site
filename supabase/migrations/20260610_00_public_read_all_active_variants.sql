-- S1/S2 — Storefront precisa receber TODAS as variantes de produtos ativos,
-- inclusive as SEM estoque, para:
--   (S1) exibir variantes/tamanhos esgotados riscados (não somem);
--   (S2) bloquear a compra quando a variante selecionada está sem estoque.
--
-- A policy anterior ("Public can read variants with stock") filtrava stock > 0,
-- então variantes esgotadas ficavam invisíveis ao público. Um produto com TODAS
-- as variantes zeradas chegava ao front como "sem variante" → era tratado como
-- produto simples e podia ser adicionado à sacola. Esta migration remove o
-- filtro de estoque da leitura pública (a cobrança/checkout já valida estoque
-- server-side no RPC create_order_with_reservation).

DROP POLICY IF EXISTS "Public can read variants with stock" ON product_variants;
DROP POLICY IF EXISTS "Public can read variants of active products" ON product_variants;

CREATE POLICY "Public can read variants of active products"
  ON product_variants
  FOR SELECT
  USING (
    active = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
        AND products.active = true
        AND products.deleted_at IS NULL
    )
  );
