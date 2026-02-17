-- ============================================
-- INSTITUTIONAL PAGES - Páginas Institucionais Dinâmicas
-- Data: 2026-02-15
-- Tabelas: static_pages, footer_links
-- Nota: store_faqs já existe no banco
-- ============================================

-- ============================================
-- 1. STORE_FAQS — Apenas adicionar coluna category se não existir
-- ============================================
ALTER TABLE store_faqs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'geral';
CREATE INDEX IF NOT EXISTS idx_store_faqs_category ON store_faqs(brand_id, category);

-- ============================================
-- 2. TABELA: STATIC_PAGES (Páginas Estáticas Genéricas)
-- ============================================
CREATE TABLE static_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(brand_id, slug)
);

CREATE INDEX idx_static_pages_brand ON static_pages(brand_id);
CREATE INDEX idx_static_pages_slug ON static_pages(brand_id, slug);
CREATE INDEX idx_static_pages_brand_active ON static_pages(brand_id, active) WHERE active = true;

CREATE TRIGGER update_static_pages_updated_at
  BEFORE UPDATE ON static_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE static_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active static pages"
  ON static_pages FOR SELECT
  USING (active = true);

COMMENT ON TABLE static_pages IS 'Páginas estáticas genéricas (Sobre, Contato, Privacidade, Trocas, etc.) — conteúdo HTML por marca';

-- ============================================
-- 3. TABELA: FOOTER_LINKS (Links Dinâmicos do Rodapé)
-- ============================================
CREATE TABLE footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT,
  icon TEXT,
  is_external BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_footer_links_brand ON footer_links(brand_id);
CREATE INDEX idx_footer_links_group ON footer_links(brand_id, group_name);
CREATE INDEX idx_footer_links_brand_active ON footer_links(brand_id, active) WHERE active = true;

CREATE TRIGGER update_footer_links_updated_at
  BEFORE UPDATE ON footer_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE footer_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active footer links"
  ON footer_links FOR SELECT
  USING (active = true);

COMMENT ON TABLE footer_links IS 'Links dinâmicos do rodapé, agrupados por seção (institucional, ajuda, etc.)';

-- ============================================
-- 4. ESTENDER brands.settings COM contact E social
-- ============================================
UPDATE brands
SET settings = settings || '{
  "contact": {
    "email": "contato@seshstore.com.br",
    "phone": "(21) 99999-9999",
    "whatsapp": "5521999999999",
    "address": "Rio de Janeiro, RJ - Brasil"
  },
  "social": {
    "instagram": "https://instagram.com/seshstore",
    "facebook": "https://facebook.com/seshstore",
    "youtube": "https://youtube.com/seshstore",
    "twitter": "https://twitter.com/seshstore"
  }
}'::jsonb
WHERE slug = 'sesh';

-- ============================================
-- 5. SEED DATA - Marca SESH
-- ============================================
DO $$
DECLARE
  sesh_id UUID;
BEGIN
  SELECT id INTO sesh_id FROM brands WHERE slug = 'sesh';

  -- ---- FAQs ----
  INSERT INTO store_faqs (brand_id, category, question, answer, position) VALUES
    (sesh_id, 'pedidos', 'Qual o prazo de entrega?',
     'O prazo de entrega varia de acordo com a sua região. Após a confirmação do pagamento, o envio é feito em até 3 dias úteis. A entrega pode levar de 5 a 15 dias úteis dependendo da localidade.',
     1),
    (sesh_id, 'pedidos', 'Como rastrear meu pedido?',
     'Após o envio, você receberá um e-mail com o código de rastreamento. Utilize esse código no site dos Correios ou da transportadora para acompanhar a entrega.',
     2),
    (sesh_id, 'pedidos', 'Posso cancelar meu pedido?',
     'Sim, você pode solicitar o cancelamento antes do envio. Após o despacho, será necessário aguardar o recebimento e solicitar a devolução conforme nossa política de trocas.',
     3),
    (sesh_id, 'trocas', 'Como solicitar uma troca ou devolução?',
     'Você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução. Entre em contato pelo nosso WhatsApp informando o número do pedido e o motivo.',
     4),
    (sesh_id, 'trocas', 'A troca tem custo?',
     'A primeira troca por defeito de fabricação é gratuita. Trocas por outros motivos (tamanho, cor) podem ter custo de frete, dependendo da sua região.',
     5),
    (sesh_id, 'pagamentos', 'Quais formas de pagamento são aceitas?',
     'Aceitamos cartão de crédito (até 12x), PIX e boleto bancário. No PIX e boleto, o pagamento deve ser confirmado antes do envio.',
     6),
    (sesh_id, 'pagamentos', 'O pagamento via PIX é seguro?',
     'Sim! O PIX é uma forma de pagamento instantânea e segura, regulamentada pelo Banco Central. Nosso QR Code é gerado diretamente pelo gateway de pagamento certificado.',
     7),
    (sesh_id, 'geral', 'Vocês possuem loja física?',
     'Atualmente operamos exclusivamente online, o que nos permite oferecer os melhores preços e atender todo o Brasil.',
     8);

  -- ---- STATIC PAGES ----
  INSERT INTO static_pages (brand_id, slug, title, content, meta_title, meta_description, position) VALUES
    (sesh_id, 'sobre-nos', 'Quem Somos',
     '<div class="space-y-6">
<p class="text-xl font-bold">A Sesh nasceu em 2012 com um propósito claro: traduzir a energia caótica e criativa das ruas em vestuário de alta qualidade.</p>

<div class="grid md:grid-cols-2 gap-8 items-center my-8">
  <img src="https://images.unsplash.com/photo-1563618170258-208b5f36e927?auto=format&fit=crop&q=80&w=800" alt="Sesh Team" class="rounded-lg shadow-lg" />
  <div>
    <h2 class="text-3xl font-bold mb-4">A MISSÃO</h2>
    <p class="mb-4">Não vendemos apenas roupas. Vendemos a sensação de acertar uma manobra depois de 100 tentativas. A liberdade de um rolê de madrugada. A expressão de um throw-up na parede cinza.</p>
    <p>Nossa missão é fomentar a cultura urbana, apoiando artistas locais, skatistas independentes e eventos que mantêm a chama da rua acesa.</p>
  </div>
</div>

<h2 class="text-3xl font-bold text-center mb-6">NOSSOS VALORES</h2>
<div class="grid md:grid-cols-3 gap-6 text-center">
  <div class="p-6 border-2 border-current rounded-lg">
    <h3 class="font-bold text-xl mb-2">AUTENTICIDADE</h3>
    <p class="text-sm">Sem cópias. Design original criado por quem vive a cultura.</p>
  </div>
  <div class="p-6 border-2 border-current rounded-lg">
    <h3 class="font-bold text-xl mb-2">QUALIDADE</h3>
    <p class="text-sm">Tecidos premium e modelagens pensadas para durar no lixo ou no luxo.</p>
  </div>
  <div class="p-6 border-2 border-current rounded-lg">
    <h3 class="font-bold text-xl mb-2">COMUNIDADE</h3>
    <p class="text-sm">Crescemos juntos. Parte do lucro volta para o corre.</p>
  </div>
</div>
</div>',
     'Quem Somos | Conheça a SESH',
     'Conheça a história da SESH, uma marca nascida da cultura urbana com foco em autenticidade, qualidade e comunidade.',
     1),

    (sesh_id, 'contato', 'Fale Conosco',
     '<div class="space-y-6">
<p class="text-lg">Tem alguma dúvida, sugestão ou quer falar com a gente? Estamos sempre prontos para te atender!</p>

<div class="grid md:grid-cols-2 gap-6 my-8">
  <div class="p-6 bg-gray-50 rounded-lg">
    <h3 class="font-bold text-lg mb-2">📧 E-mail</h3>
    <p>contato@seshstore.com.br</p>
  </div>
  <div class="p-6 bg-gray-50 rounded-lg">
    <h3 class="font-bold text-lg mb-2">📱 WhatsApp</h3>
    <p>(21) 99999-9999</p>
    <p class="text-sm text-gray-500 mt-1">Seg a Sex, 9h às 18h</p>
  </div>
</div>

<div class="p-6 bg-gray-50 rounded-lg">
  <h3 class="font-bold text-lg mb-2">⏱ Tempo de Resposta</h3>
  <p>Respondemos todas as mensagens em até 48 horas úteis. Para assuntos urgentes, entre em contato pelo WhatsApp.</p>
</div>
</div>',
     'Fale Conosco | SESH',
     'Entre em contato com a SESH. Atendemos por e-mail e WhatsApp de segunda a sexta.',
     2),

    (sesh_id, 'politica-de-privacidade', 'Política de Privacidade',
     '<div class="space-y-6">
<h2 class="text-2xl font-bold">1. Informações que Coletamos</h2>
<p>Coletamos informações pessoais que você nos fornece diretamente ao realizar uma compra, criar uma conta ou entrar em contato conosco. Isso inclui: nome, e-mail, telefone, endereço de entrega e dados de pagamento.</p>

<h2 class="text-2xl font-bold">2. Como Utilizamos suas Informações</h2>
<p>Utilizamos seus dados para: processar pedidos e pagamentos, enviar atualizações sobre seus pedidos, melhorar nossos produtos e serviços, e enviar comunicações de marketing (com seu consentimento).</p>

<h2 class="text-2xl font-bold">3. Compartilhamento de Dados</h2>
<p>Não vendemos suas informações pessoais. Compartilhamos dados apenas com: processadores de pagamento, transportadoras para entrega e ferramentas de análise para melhorar nosso serviço.</p>

<h2 class="text-2xl font-bold">4. Segurança</h2>
<p>Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações pessoais contra acesso não autorizado, alteração ou destruição.</p>

<h2 class="text-2xl font-bold">5. Seus Direitos</h2>
<p>De acordo com a LGPD, você tem direito a: acessar seus dados, solicitar correção, solicitar exclusão, revogar consentimento e solicitar portabilidade dos dados.</p>

<h2 class="text-2xl font-bold">6. Contato</h2>
<p>Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato pelo e-mail: contato@seshstore.com.br</p>
</div>',
     'Política de Privacidade | SESH',
     'Conheça nossa política de privacidade e proteção de dados pessoais conforme a LGPD.',
     3),

    (sesh_id, 'trocas-e-devolucoes', 'Trocas e Devoluções',
     '<div class="space-y-6">
<h2 class="text-2xl font-bold">Prazo para Troca</h2>
<p>Você tem até <strong>7 dias corridos</strong> após o recebimento do produto para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor.</p>

<h2 class="text-2xl font-bold">Como Solicitar</h2>
<p>Entre em contato pelo nosso WhatsApp ou e-mail informando:</p>
<ul class="list-disc pl-6 space-y-1">
  <li>Número do pedido</li>
  <li>Motivo da troca/devolução</li>
  <li>Fotos do produto (se aplicável)</li>
</ul>

<h2 class="text-2xl font-bold">Condições para Troca</h2>
<ul class="list-disc pl-6 space-y-1">
  <li>O produto deve estar sem uso e com etiquetas originais</li>
  <li>Deve estar na embalagem original</li>
  <li>Produtos personalizados não são elegíveis para troca</li>
</ul>

<h2 class="text-2xl font-bold">Custos de Envio</h2>
<p>Em caso de <strong>defeito de fabricação</strong>, o custo de envio da troca é por nossa conta. Para trocas por outros motivos (tamanho, cor, preferência), o custo do frete de devolução é responsabilidade do cliente.</p>

<h2 class="text-2xl font-bold">Reembolso</h2>
<p>Após recebermos e aprovarmos a devolução, o reembolso será processado em até 10 dias úteis na mesma forma de pagamento utilizada na compra.</p>
</div>',
     'Trocas e Devoluções | SESH',
     'Saiba como solicitar trocas e devoluções na SESH. Prazo de 7 dias, processo simples e transparente.',
     4),

    (sesh_id, 'termos-de-uso', 'Termos de Uso',
     '<div class="space-y-6">
<h2 class="text-2xl font-bold">1. Aceitação dos Termos</h2>
<p>Ao acessar e utilizar este site, você concorda com estes termos de uso. Se não concordar com algum dos termos, recomendamos que não utilize nossos serviços.</p>

<h2 class="text-2xl font-bold">2. Uso do Site</h2>
<p>Este site destina-se exclusivamente à venda de produtos da marca. É proibido utilizar o site para fins ilegais ou não autorizados.</p>

<h2 class="text-2xl font-bold">3. Propriedade Intelectual</h2>
<p>Todo o conteúdo deste site, incluindo textos, imagens, logotipos e design, é de propriedade exclusiva da marca e protegido por leis de propriedade intelectual.</p>

<h2 class="text-2xl font-bold">4. Preços e Pagamentos</h2>
<p>Os preços podem ser alterados sem aviso prévio. O pagamento deve ser realizado integralmente antes do envio dos produtos.</p>

<h2 class="text-2xl font-bold">5. Entrega</h2>
<p>Os prazos de entrega são estimativas e podem variar conforme a região e disponibilidade das transportadoras. Não nos responsabilizamos por atrasos causados por terceiros.</p>
</div>',
     'Termos de Uso | SESH',
     'Leia nossos termos de uso para entender as condições de utilização do site e compras.',
     5),

    (sesh_id, 'prazos-de-entrega', 'Prazos de Entrega',
     '<div class="space-y-6">
<p class="text-lg">Trabalhamos para que seu pedido chegue o mais rápido possível!</p>

<h2 class="text-2xl font-bold">Processamento</h2>
<p>Após a confirmação do pagamento, seu pedido é separado e embalado em até <strong>3 dias úteis</strong>.</p>

<h2 class="text-2xl font-bold">Prazos por Região</h2>
<div class="overflow-x-auto">
<table class="w-full border-collapse">
  <thead>
    <tr class="border-b-2 border-gray-200">
      <th class="text-left py-3 px-4">Região</th>
      <th class="text-left py-3 px-4">Prazo Estimado</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-gray-100"><td class="py-3 px-4">Sudeste</td><td class="py-3 px-4">3 a 7 dias úteis</td></tr>
    <tr class="border-b border-gray-100"><td class="py-3 px-4">Sul</td><td class="py-3 px-4">5 a 10 dias úteis</td></tr>
    <tr class="border-b border-gray-100"><td class="py-3 px-4">Centro-Oeste</td><td class="py-3 px-4">5 a 10 dias úteis</td></tr>
    <tr class="border-b border-gray-100"><td class="py-3 px-4">Nordeste</td><td class="py-3 px-4">7 a 12 dias úteis</td></tr>
    <tr class="border-b border-gray-100"><td class="py-3 px-4">Norte</td><td class="py-3 px-4">10 a 15 dias úteis</td></tr>
  </tbody>
</table>
</div>

<h2 class="text-2xl font-bold">Frete Grátis</h2>
<p>Oferecemos frete grátis para compras acima do valor mínimo estabelecido. Confira as condições no carrinho de compras.</p>

<h2 class="text-2xl font-bold">Rastreamento</h2>
<p>Após o envio, você receberá o código de rastreamento por e-mail para acompanhar sua entrega em tempo real.</p>
</div>',
     'Prazos de Entrega | SESH',
     'Confira os prazos de entrega por região. Envio em até 3 dias úteis após confirmação do pagamento.',
     6);

  -- ---- FOOTER LINKS ----
  INSERT INTO footer_links (brand_id, group_name, label, url, position) VALUES
    (sesh_id, 'institucional', 'Sobre Nós', '/page/sobre-nos', 1),
    (sesh_id, 'institucional', 'Termos de Uso', '/page/termos-de-uso', 2),
    (sesh_id, 'institucional', 'Política de Privacidade', '/page/politica-de-privacidade', 3),

    (sesh_id, 'ajuda', 'Perguntas Frequentes', '/faq', 1),
    (sesh_id, 'ajuda', 'Trocas e Devoluções', '/page/trocas-e-devolucoes', 2),
    (sesh_id, 'ajuda', 'Prazos de Entrega', '/page/prazos-de-entrega', 3),
    (sesh_id, 'ajuda', 'Fale Conosco', '/page/contato', 4);

END $$;
