-- Add price columns to product_variants
-- When NULL, the product base price is used (backward compatible)
ALTER TABLE product_variants
  ADD COLUMN price DECIMAL(10,2),
  ADD COLUMN compare_at_price DECIMAL(10,2);

COMMENT ON COLUMN product_variants.price IS 'Preço da variante. Quando NULL, usa o preço base do produto.';
COMMENT ON COLUMN product_variants.compare_at_price IS 'Preço comparativo da variante (preço "de"). Quando NULL, usa o compare_at_price do produto.';
