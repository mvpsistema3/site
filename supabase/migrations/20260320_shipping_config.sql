-- ============================================
-- Migration: shipping_config
-- Tabela para configuração de frete dinâmica
-- Permite alterar CEP de origem e dimensões da caixa sem redeploy
-- ============================================

-- Criar tabela shipping_config (singleton - apenas 1 registro)
CREATE TABLE IF NOT EXISTS shipping_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_cep TEXT NOT NULL DEFAULT '24330286',
  box_height NUMERIC(6,2) NOT NULL DEFAULT 12,
  box_length NUMERIC(6,2) NOT NULL DEFAULT 25,
  box_width NUMERIC(6,2) NOT NULL DEFAULT 15,
  box_weight NUMERIC(6,2) NOT NULL DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO shipping_config (seller_cep, box_height, box_length, box_width, box_weight)
VALUES ('24330286', 12, 25, 15, 0.8);

-- RLS: leitura pública, escrita apenas para admins autenticados
ALTER TABLE shipping_config ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler (Edge Function e frontend usam anon key)
CREATE POLICY "shipping_config_select_public"
  ON shipping_config
  FOR SELECT
  USING (true);

-- Apenas usuários autenticados podem atualizar
CREATE POLICY "shipping_config_update_authenticated"
  ON shipping_config
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Impedir inserção de novos registros (singleton)
CREATE POLICY "shipping_config_insert_deny"
  ON shipping_config
  FOR INSERT
  WITH CHECK (false);

-- Impedir deleção
CREATE POLICY "shipping_config_delete_deny"
  ON shipping_config
  FOR DELETE
  USING (false);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_shipping_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipping_config_updated_at
  BEFORE UPDATE ON shipping_config
  FOR EACH ROW
  EXECUTE FUNCTION update_shipping_config_updated_at();

-- Constraint para garantir apenas 1 registro (singleton)
CREATE UNIQUE INDEX shipping_config_singleton ON shipping_config ((true));
