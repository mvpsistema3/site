# 🚀 PLANO DE AÇÃO - IMPLEMENTAÇÃO MULTI-TENANT

**Projeto:** Sesh Store Multi-Tenant E-commerce
**Data de Início:** 24 de Janeiro de 2026
**Estimativa Total:** 18-20 dias úteis

**Marcas:**
- 🟦 **Sesh Store** (seshstore.com.br)
- 🟧 **Grupo GOT** (grupogot.com)
- 🟩 **The OG** (theog.com.br)

---

## 📊 VISÃO GERAL DO PROGRESSO

**Status Geral:** 🔴 Não Iniciado

### Fases
- [ ] **FASE 1:** Fundação do Banco de Dados (3 dias)
- [ ] **FASE 2:** Infraestrutura Frontend (4 dias)
- [ ] **FASE 3:** Camada de Dados (3 dias)
- [ ] **FASE 4:** Integração Asaas (4 dias)
- [ ] **FASE 5:** UI/UX Ajustes (3 dias)
- [ ] **FASE 6:** Testes e Deploy (3 dias)

---

## 🗄️ FASE 1: FUNDAÇÃO DO BANCO DE DADOS

**Duração:** 3 dias
**Prioridade:** 🔴 CRÍTICA
**Objetivo:** Criar estrutura completa do banco Supabase com suporte multi-tenant

### DIA 1: Setup Inicial e Tabelas Core

#### 1.1 Preparação
- [ ] Acessar dashboard do Supabase (https://supabase.com/dashboard)
- [ ] Abrir SQL Editor no projeto
- [ ] Criar arquivo local: `supabase/migrations/20260124_multi_tenant.sql`

#### 1.2 Funções Helper
- [ ] Copiar função `update_updated_at_column()` do spec (linhas 598-611)
- [ ] Executar no SQL Editor do Supabase
- [ ] **Validar:** Executar `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'update_updated_at_column';`
- [ ] ✅ Deve retornar 1 linha

#### 1.3 Tabela Central: BRANDS
- [ ] Copiar SQL da tabela `brands` (linhas 119-183)
- [ ] Executar no SQL Editor
- [ ] **Validar:** Executar `SELECT * FROM brands;`
- [ ] ✅ Tabela criada com 0 registros

#### 1.4 Tabela: PRODUCTS
- [ ] Copiar SQL da tabela `products` (linhas 187-248)
- [ ] Executar no SQL Editor
- [ ] **Validar:** `\d products` ou verificar estrutura no Table Editor
- [ ] ✅ Confirmar que coluna `brand_id` existe

#### 1.5 Tabela: PRODUCT_IMAGES
- [ ] Copiar SQL da tabela `product_images` (linhas 250-283)
- [ ] Executar no SQL Editor
- [ ] **Validar:** `SELECT * FROM product_images;`

#### 1.6 Tabela: PRODUCT_VARIANTS
- [ ] Copiar SQL da tabela `product_variants` (linhas 285-342)
- [ ] Executar no SQL Editor
- [ ] **Validar:** Verificar constraints `CHECK (stock >= 0)`

---

### DIA 2: Tabelas Secundárias e RLS

#### 1.7 Tabela: COLLECTIONS
- [ ] Copiar SQL da tabela `collections` (linhas 344-390)
- [ ] Executar no SQL Editor
- [ ] **Validar:** `SELECT * FROM collections;`

#### 1.8 Tabela: COLLECTION_PRODUCTS
- [ ] Copiar SQL da tabela `collection_products` (linhas 392-418)
- [ ] Executar no SQL Editor
- [ ] **Validar:** Confirmar chave primária composta (collection_id, product_id)

#### 1.9 Tabela: ORDERS
- [ ] Copiar SQL da tabela `orders` (linhas 420-505)
- [ ] Executar no SQL Editor
- [ ] **Validar:** Verificar campo `asaas_payment_id` existe

#### 1.10 Tabela: ORDER_ITEMS
- [ ] Copiar SQL da tabela `order_items` (linhas 507-550)
- [ ] Executar no SQL Editor
- [ ] **Validar:** Confirmar constraint `CHECK (subtotal = price * quantity)`

#### 1.11 Tabela: BANNERS
- [ ] Copiar SQL da tabela `banners` (linhas 552-592)
- [ ] Executar no SQL Editor
- [ ] **Validar:** `SELECT * FROM banners;`

#### 1.12 Função: GENERATE_ORDER_NUMBER
- [ ] Copiar função `generate_order_number()` (linhas 613-664)
- [ ] Executar no SQL Editor
- [ ] **Validar:** `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'generate_order_number';`

#### 1.13 Ativar Row Level Security (RLS)
- [ ] Copiar SQL de ativação RLS (linhas 672-686)
- [ ] Executar no SQL Editor
- [ ] **Validar:** No Table Editor, verificar que todas as tabelas têm "RLS enabled" = true

#### 1.14 Políticas de SELECT (Públicas)
- [ ] Copiar políticas de SELECT (linhas 688-733)
- [ ] Executar no SQL Editor
- [ ] **Validar:** No Table Editor > Policies, verificar que políticas foram criadas

#### 1.15 Políticas de ORDERS (Privadas)
- [ ] Copiar políticas de ORDERS (linhas 735-764)
- [ ] Executar no SQL Editor
- [ ] **Validar:** Verificar políticas "Users can read own orders" e "Anyone can create orders"

---

### DIA 3: Seed Data e Validação

#### 1.16 Preparar Seed Data
- [ ] Criar arquivo `supabase/seed.sql`
- [ ] Definir temas das 3 marcas:
  - **Sesh:** Cyan (#00FFFF) + Preto (#000000)
  - **Grupo GOT:** Laranja (#FF6B00) + Branco (#FFFFFF)
  - **The OG:** Verde (#00FF00) + Preto (#000000)

#### 1.17 Inserir Marcas no Banco
- [ ] Copiar template SQL de seed (linhas 772-865)
- [ ] Ajustar configurações das marcas:
  ```sql
  INSERT INTO brands (slug, name, domain, theme, features, settings, asaas_environment)
  VALUES
    ('sesh', 'Sesh Store', 'seshstore.com.br', '{"primaryColor": "#00FFFF", ...}', ...),
    ('grupogot', 'Grupo GOT', 'grupogot.com', '{"primaryColor": "#FF6B00", ...}', ...),
    ('theog', 'The OG', 'theog.com.br', '{"primaryColor": "#00FF00", ...}', ...);
  ```
- [ ] Executar no SQL Editor
- [ ] **Validar:** `SELECT slug, name, domain FROM brands;`
- [ ] ✅ Deve retornar exatamente 3 marcas

#### 1.18 Criar Produtos de Teste (Opcional)
- [ ] Inserir 2-3 produtos para cada marca
- [ ] Exemplo:
  ```sql
  INSERT INTO products (brand_id, name, slug, description, price, category, active)
  VALUES
    ((SELECT id FROM brands WHERE slug = 'sesh'), 'Camiseta Sesh Preta', 'camiseta-sesh-preta', 'Camiseta streetwear', 89.90, 'camisetas', true);
  ```

#### 1.19 Testes de Isolamento Multi-Tenant
- [ ] Executar query de teste:
  ```sql
  -- Deve retornar apenas produtos da marca 'sesh'
  SELECT p.name, b.slug as brand
  FROM products p
  JOIN brands b ON b.id = p.brand_id
  WHERE p.brand_id = (SELECT id FROM brands WHERE slug = 'sesh');
  ```
- [ ] **Validar:** Nenhum produto de outras marcas aparece no resultado

#### 1.20 Configurar Supabase Storage (Opcional)
- [ ] Criar bucket `product-images` no Storage
- [ ] Configurar políticas de acesso público para leitura
- [ ] **Validar:** Upload de teste de uma imagem

---

## 💻 FASE 2: INFRAESTRUTURA FRONTEND

**Duração:** 4 dias
**Prioridade:** 🟡 ALTA
**Objetivo:** Criar sistema de detecção de marca e context API

### DIA 4: Sistema de Detecção de Marca

#### 2.1 Criar Configuração de Marcas
- [ ] Criar arquivo `src/config/brands.ts`
- [ ] Copiar código completo do spec (linhas 871-997)
- [ ] Definir interfaces:
  - `BrandTheme`
  - `BrandFeatures`
  - `BrandSettings`
  - `Brand`
- [ ] Configurar objeto `BRANDS` com as 3 marcas
- [ ] **Validar:** Importar no console: `import { BRANDS } from './config/brands'`

#### 2.2 Criar Brand Detection
- [ ] Criar arquivo `src/lib/brand-detection.ts`
- [ ] Copiar código do spec (linhas 999-1068)
- [ ] Implementar função `detectBrand()`
- [ ] Implementar função `getCurrentBrand()`
- [ ] Implementar função `getBrandId()` (busca UUID no Supabase)
- [ ] **Validar:** Testar no console:
  ```typescript
  import { detectBrand } from './lib/brand-detection';
  console.log(detectBrand()); // Deve retornar 'sesh' no localhost
  ```

#### 2.3 Configurar Mapeamento de Domínios
- [ ] Editar `src/lib/brand-detection.ts`
- [ ] Atualizar `domainMap`:
  ```typescript
  const domainMap: Record<string, BrandId> = {
    'seshstore.com.br': 'sesh',
    'www.seshstore.com.br': 'sesh',
    'grupogot.com': 'grupogot',
    'www.grupogot.com': 'grupogot',
    'theog.com.br': 'theog',
    'www.theog.com.br': 'theog',
    'localhost': 'sesh',
    '127.0.0.1': 'sesh',
  };
  ```

---

### DIA 5: Brand Context e Provider

#### 2.4 Criar Brand Context
- [ ] Criar arquivo `src/contexts/BrandContext.tsx`
- [ ] Copiar código do spec (linhas 1070-1116)
- [ ] Implementar `BrandProvider` component
- [ ] Implementar hook `useBrand()`
- [ ] Adicionar estado de loading
- [ ] **Validar:** Provider criado sem erros de TypeScript

#### 2.5 Adicionar Cache de Brand ID
- [ ] Implementar cache local do `brand_uuid`
- [ ] Usar `useState` e `useEffect` para buscar do Supabase
- [ ] Adicionar fallback em caso de erro
- [ ] **Código:**
  ```typescript
  const [brandUuid, setBrandUuid] = useState<string | null>(null);

  useEffect(() => {
    getBrandId(brandId).then(setBrandUuid).catch(console.error);
  }, [brandId]);
  ```

#### 2.6 Integrar BrandProvider no App
- [ ] Abrir `src/App.tsx`
- [ ] Importar `BrandProvider`
- [ ] Envolver toda aplicação:
  ```typescript
  export default function App() {
    return (
      <BrandProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </BrandProvider>
    );
  }
  ```
- [ ] **Validar:** App ainda renderiza sem erros

---

### DIA 6: Temas Dinâmicos

#### 2.7 Implementar Aplicação de Temas
- [ ] Editar `src/App.tsx`
- [ ] Criar componente `AppContent` (linhas 1258-1307)
- [ ] Adicionar `useEffect` para aplicar tema:
  ```typescript
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', brand.theme.primaryColor);
    root.style.setProperty('--color-secondary', brand.theme.secondaryColor);
    root.style.setProperty('--color-background', brand.theme.backgroundColor);
    root.style.setProperty('--color-text', brand.theme.textColor);

    document.title = brand.name;

    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = brand.theme.favicon;

    root.style.fontFamily = brand.theme.font;
  }, [brand]);
  ```

#### 2.8 Configurar CSS Variables no Tailwind
- [ ] Editar `tailwind.config.js` (ou criar se não existir)
- [ ] Adicionar variáveis CSS:
  ```javascript
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        background: 'var(--color-background)',
        text: 'var(--color-text)',
      },
    },
  }
  ```

#### 2.9 Criar Assets de Marcas
- [ ] Criar estrutura de pastas:
  ```
  public/
  ├── logos/
  │   ├── sesh.svg
  │   ├── grupogot.svg
  │   └── theog.svg
  └── favicons/
      ├── sesh.ico
      ├── grupogot.ico
      └── theog.ico
  ```
- [ ] Adicionar logos temporários (pode ser texto SVG)
- [ ] **Validar:** Logos carregam no navegador

---

### DIA 7: Testes de Detecção

#### 2.10 Testar Detecção no Localhost
- [ ] Iniciar servidor: `npm run dev`
- [ ] Abrir console do navegador
- [ ] Executar: `window.location.hostname`
- [ ] **Validar:** Deve retornar 'localhost'
- [ ] Verificar que marca detectada é 'sesh'

#### 2.11 Testar Troca de Marca (Simulação)
- [ ] Abrir `src/lib/brand-detection.ts`
- [ ] Temporariamente forçar retorno:
  ```typescript
  export function detectBrand(): BrandId {
    return 'grupogot'; // ← Forçar marca
  }
  ```
- [ ] Recarregar página
- [ ] **Validar:** Tema e logo mudam para Grupo GOT
- [ ] Reverter mudança

#### 2.12 Verificar Performance
- [ ] Abrir React DevTools
- [ ] Verificar que `BrandProvider` não causa re-renders desnecessários
- [ ] **Validar:** `useBrand()` retorna mesma referência

---

## 🔌 FASE 3: CAMADA DE DADOS (HOOKS MULTI-TENANT)

**Duração:** 3 dias
**Prioridade:** 🟡 ALTA
**Objetivo:** Adaptar hooks existentes e criar novos com filtro de marca

### DIA 8: Atualizar Types TypeScript

#### 3.1 Modificar Types de Product
- [ ] Abrir `src/lib/supabase.ts`
- [ ] Adicionar `brand_id: string` em:
  - `Product`
  - `ProductImage` (se não existir, criar interface)
  - `ProductVariant` (se não existir, criar interface)
- [ ] **Código:**
  ```typescript
  export type Product = {
    id: string;
    brand_id: string; // ← ADICIONAR
    name: string;
    slug: string;
    description: string;
    price: number;
    compare_at_price?: number;
    category: string;
    tags: string[];
    active: boolean;
    featured: boolean;
    created_at: string;
    updated_at: string;
  };
  ```

#### 3.2 Criar Types Completos
- [ ] Criar interfaces faltantes em `src/lib/supabase.ts`:
  - `ProductImage`
  - `ProductVariant`
  - `Collection`
  - `Banner`
- [ ] Adicionar `brand_id` em TODOS os types
- [ ] **Validar:** Executar `npm run build` - não deve ter erros de tipo

#### 3.3 Atualizar Type de Order
- [ ] Modificar `Order` type:
  ```typescript
  export type Order = {
    id: string;
    brand_id: string; // ← ADICIONAR
    user_id?: string;
    order_number: string; // ← ADICIONAR
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_cpf: string;
    shipping_address: Record<string, string>;
    subtotal: number;
    shipping_cost: number;
    discount: number;
    total: number;
    status: string;
    payment_status: string;
    asaas_payment_id?: string; // ← ADICIONAR
    asaas_invoice_url?: string; // ← ADICIONAR
    payment_method: string;
    installments: number;
    created_at: string;
    updated_at: string;
  };
  ```

---

### DIA 9: Modificar Hooks Existentes

#### 3.4 Atualizar useProducts
- [ ] Abrir `src/hooks/useProducts.ts`
- [ ] Importar `useBrand` e `getBrandId`
- [ ] Modificar `useProducts()`:
  ```typescript
  export function useProducts() {
    const { brandId } = useBrand();

    return useQuery({
      queryKey: ['products', brandId], // ← Cache por marca
      queryFn: async () => {
        const brandUuid = await getBrandId(brandId);

        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            images:product_images(id, url, alt_text, position),
            variants:product_variants(id, color, color_hex, size, sku, stock)
          `)
          .eq('brand_id', brandUuid) // ← FILTRO CRÍTICO
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
    });
  }
  ```

#### 3.5 Atualizar useProduct (Single)
- [ ] Modificar `useProduct(id)` ou `useProduct(slug)`:
  ```typescript
  export function useProduct(slug: string) {
    const { brandId } = useBrand();

    return useQuery({
      queryKey: ['product', brandId, slug],
      queryFn: async () => {
        const brandUuid = await getBrandId(brandId);

        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            images:product_images(*),
            variants:product_variants(*)
          `)
          .eq('brand_id', brandUuid)
          .eq('slug', slug)
          .single();

        if (error) throw error;
        return data;
      },
    });
  }
  ```

#### 3.6 Atualizar useProductsByCategory
- [ ] Adicionar filtro `brand_id`:
  ```typescript
  .eq('brand_id', brandUuid)
  .eq('category', category)
  ```

#### 3.7 Atualizar useFeaturedProducts
- [ ] Adicionar filtro `brand_id`:
  ```typescript
  .eq('brand_id', brandUuid)
  .eq('featured', true)
  ```

#### 3.8 Atualizar useSearchProducts
- [ ] Adicionar filtro `brand_id`:
  ```typescript
  .eq('brand_id', brandUuid)
  .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
  ```

#### 3.9 Testar Hooks Modificados
- [ ] Iniciar dev server: `npm run dev`
- [ ] Abrir página de produtos
- [ ] Abrir console e verificar query do Supabase
- [ ] **Validar:** Query contém filtro `.eq('brand_id', '...')`

---

### DIA 10: Criar Novos Hooks

#### 3.10 Criar useCollections
- [ ] Criar arquivo `src/hooks/useCollections.ts`
- [ ] Implementar hook:
  ```typescript
  export function useCollections() {
    const { brandId } = useBrand();

    return useQuery({
      queryKey: ['collections', brandId],
      queryFn: async () => {
        const brandUuid = await getBrandId(brandId);

        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('brand_id', brandUuid)
          .eq('active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
    });
  }
  ```

#### 3.11 Criar useCollection (Single)
- [ ] Adicionar no mesmo arquivo:
  ```typescript
  export function useCollection(slug: string) {
    const { brandId } = useBrand();

    return useQuery({
      queryKey: ['collection', brandId, slug],
      queryFn: async () => {
        const brandUuid = await getBrandId(brandId);

        const { data, error } = await supabase
          .from('collections')
          .select(`
            *,
            products:collection_products(
              product_id,
              product:products(*)
            )
          `)
          .eq('brand_id', brandUuid)
          .eq('slug', slug)
          .single();

        if (error) throw error;
        return data;
      },
    });
  }
  ```

#### 3.12 Criar useBanners
- [ ] Criar arquivo `src/hooks/useBanners.ts`
- [ ] Implementar hook:
  ```typescript
  export function useBanners() {
    const { brandId } = useBrand();

    return useQuery({
      queryKey: ['banners', brandId],
      queryFn: async () => {
        const brandUuid = await getBrandId(brandId);
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('brand_id', brandUuid)
          .eq('active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .order('position', { ascending: true });

        if (error) throw error;
        return data;
      },
    });
  }
  ```

#### 3.13 Atualizar useOrders
- [ ] Abrir `src/hooks/useOrders.ts`
- [ ] Adicionar filtro `brand_id`:
  ```typescript
  .eq('brand_id', brandUuid)
  .eq('user_id', userId)
  ```

#### 3.14 Validar Todos os Hooks
- [ ] Executar `npm run build`
- [ ] **Validar:** Build completa sem erros
- [ ] Testar cada hook em uma página de teste

---

## 💳 FASE 4: INTEGRAÇÃO ASAAS

**Duração:** 4 dias
**Prioridade:** 🟠 MÉDIA
**Objetivo:** Substituir Stripe por Asaas como gateway de pagamento

### DIA 11: Setup Asaas

#### 4.1 Criar Conta Asaas Sandbox
- [ ] Acessar https://www.asaas.com
- [ ] Criar conta de desenvolvedor
- [ ] Ativar ambiente Sandbox
- [ ] **Validar:** Acesso ao dashboard Sandbox

#### 4.2 Obter API Keys
- [ ] No dashboard Asaas, ir em "Integrações"
- [ ] Gerar API Key para Sandbox
- [ ] Copiar chave (formato: `$aact_...`)
- [ ] Guardar em local seguro (nunca commitar)

#### 4.3 Atualizar Variáveis de Ambiente
- [ ] Editar `.env.local`
- [ ] Adicionar:
  ```bash
  VITE_ASAAS_API_KEY=sua_api_key_sandbox_aqui
  VITE_ASAAS_ENVIRONMENT=sandbox
  ```
- [ ] Reiniciar dev server

#### 4.4 Atualizar Brands no Supabase
- [ ] Executar SQL:
  ```sql
  UPDATE brands
  SET
    asaas_api_key = 'SUA_API_KEY_AQUI',
    asaas_environment = 'sandbox'
  WHERE slug IN ('sesh', 'grupogot', 'theog');
  ```
- [ ] **Validar:** `SELECT slug, asaas_environment FROM brands;`

---

### DIA 12: Cliente Asaas

#### 4.5 Criar Types Asaas
- [ ] Criar arquivo `src/types/asaas.ts`
- [ ] Copiar types do spec (linhas 1313-1361)
- [ ] Definir interfaces:
  - `AsaasCustomer`
  - `AsaasPayment`
  - `AsaasPaymentResponse`
  - `AsaasPixQrCode`

#### 4.6 Criar Cliente HTTP
- [ ] Criar arquivo `src/lib/asaas.ts`
- [ ] Copiar código do spec (linhas 1313-1446)
- [ ] Implementar classe `AsaasClient`
- [ ] Implementar métodos:
  - `createCustomer()`
  - `createPayment()`
  - `getPayment()`
  - `getPixQrCode()`

#### 4.7 Criar Hook useAsaas
- [ ] No mesmo arquivo `src/lib/asaas.ts`
- [ ] Implementar hook:
  ```typescript
  export function useAsaas() {
    const { brand } = useBrand();

    // Em prod, pegar do brand.asaas_api_key
    const apiKey = import.meta.env.VITE_ASAAS_API_KEY || '';

    return new AsaasClient(apiKey);
  }
  ```

#### 4.8 Testar Conexão Asaas
- [ ] Criar teste simples:
  ```typescript
  const asaas = useAsaas();
  const customer = await asaas.createCustomer({
    name: 'Teste',
    cpfCnpj: '12345678900',
    email: 'teste@teste.com',
    phone: '11999999999',
    ...
  });
  console.log(customer);
  ```
- [ ] **Validar:** Cliente criado no Asaas Sandbox

---

### DIA 13: Hook de Checkout

#### 4.9 Criar Types de Checkout
- [ ] Criar arquivo `src/types/checkout.ts`
- [ ] Definir interface `CheckoutData`:
  ```typescript
  export interface CheckoutData {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCpf: string;
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    paymentMethod: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    installments?: number;
    cardHolderName?: string;
    cardNumber?: string;
    cardExpiry?: string;
    cardCvv?: string;
    items: CartItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
  }
  ```

#### 4.10 Criar Hook useCheckout
- [ ] Criar arquivo `src/hooks/useCheckout.ts`
- [ ] Copiar código do spec (linhas 1449-1617)
- [ ] Implementar fluxo:
  1. Criar cliente no Asaas
  2. Criar cobrança no Asaas
  3. Criar order no Supabase
  4. Criar order_items no Supabase
  5. Retornar dados

#### 4.11 Adicionar Error Handling
- [ ] Adicionar try/catch no mutationFn
- [ ] Criar mensagens de erro amigáveis
- [ ] Rollback em caso de falha (deletar order se payment falhar)

#### 4.12 Testar Checkout Completo
- [ ] Adicionar item ao carrinho
- [ ] Ir para checkout
- [ ] Preencher formulário
- [ ] Selecionar método de pagamento (PIX ou Boleto)
- [ ] Finalizar compra
- [ ] **Validar:** Order criado no Supabase e cobrança no Asaas

---

### DIA 14: Remover Stripe

#### 4.13 Desinstalar Dependências
- [ ] Executar:
  ```bash
  npm uninstall @stripe/stripe-js @stripe/react-stripe-js
  ```

#### 4.14 Remover Arquivo Stripe
- [ ] Deletar `src/lib/stripe.ts`
- [ ] **Validar:** Arquivo não existe mais

#### 4.15 Remover Imports do Stripe
- [ ] Buscar todos os arquivos que importam Stripe:
  ```bash
  grep -r "@stripe" src/
  ```
- [ ] Remover imports e código relacionado

#### 4.16 Atualizar Componente de Checkout
- [ ] Substituir componente Stripe por componente Asaas
- [ ] Remover `<Elements>` do Stripe
- [ ] Adicionar seletor de método de pagamento (Boleto/PIX/Cartão)

#### 4.17 Validar Build Final
- [ ] Executar `npm run build`
- [ ] **Validar:** Build sem erros
- [ ] **Validar:** Nenhuma referência ao Stripe no bundle

---

## 🎨 FASE 5: UI/UX AJUSTES

**Duração:** 3 dias
**Prioridade:** 🟢 BAIXA
**Objetivo:** Adaptar componentes para usar temas dinâmicos

### DIA 15: Componentes Dinâmicos

#### 5.1 Atualizar Header
- [ ] Localizar componente Header
- [ ] Adicionar logo dinâmico:
  ```typescript
  function Header() {
    const { brand } = useBrand();

    return (
      <header>
        <img src={brand.theme.logo} alt={brand.name} />
      </header>
    );
  }
  ```

#### 5.2 Atualizar Footer
- [ ] Adicionar nome da marca:
  ```typescript
  const { brand } = useBrand();
  return <footer>© 2026 {brand.name}</footer>;
  ```

#### 5.3 Atualizar Buttons
- [ ] Criar componente Button com tema:
  ```typescript
  function Button({ children, variant = 'primary', ...props }) {
    const { brand } = useBrand();

    const bgColor = variant === 'primary'
      ? brand.theme.primaryColor
      : brand.theme.secondaryColor;

    return (
      <button
        style={{ backgroundColor: bgColor }}
        className="px-4 py-2 rounded"
        {...props}
      >
        {children}
      </button>
    );
  }
  ```

#### 5.4 Atualizar Product Cards
- [ ] Usar cores de tema em badges
- [ ] Usar fonte da marca

#### 5.5 Atualizar Hero Section
- [ ] Usar banner dinâmico da marca
- [ ] Implementar hook `useBanners()`

---

### DIA 16: Feature Flags

#### 5.6 Implementar Feature: Parcelamento
- [ ] No checkout, verificar:
  ```typescript
  const { brand } = useBrand();

  {brand.features.installments && (
    <InstallmentsSelector
      max={brand.settings.maxInstallments}
    />
  )}
  ```

#### 5.7 Implementar Feature: Gift Cards
- [ ] Adicionar campo de gift card:
  ```typescript
  {brand.features.giftCards && (
    <GiftCardInput />
  )}
  ```

#### 5.8 Implementar Feature: Reviews
- [ ] Mostrar/esconder seção de reviews:
  ```typescript
  {brand.features.reviews && (
    <ProductReviews productId={product.id} />
  )}
  ```

#### 5.9 Implementar Settings: Frete Grátis
- [ ] Exibir threshold:
  ```typescript
  const { brand } = useBrand();
  const threshold = brand.settings.freeShippingThreshold;

  {cartTotal < threshold && (
    <p>Falta R$ {(threshold - cartTotal).toFixed(2)} para frete grátis!</p>
  )}
  ```

---

### DIA 17: Assets Finais

#### 5.10 Criar Logos Definitivos
- [ ] Criar logo SVG para Sesh
- [ ] Criar logo SVG para Grupo GOT
- [ ] Criar logo SVG para The OG
- [ ] Salvar em `public/logos/`

#### 5.11 Criar Favicons
- [ ] Gerar favicon .ico para cada marca
- [ ] Salvar em `public/favicons/`

#### 5.12 Criar Banners de Home
- [ ] Criar 3 banners para cada marca
- [ ] Fazer versões mobile
- [ ] Upload no Supabase Storage
- [ ] Inserir URLs na tabela `banners`

#### 5.13 Testar Responsividade
- [ ] Testar em mobile (375px)
- [ ] Testar em tablet (768px)
- [ ] Testar em desktop (1920px)
- [ ] **Validar:** Layout OK em todos os tamanhos

---

## 🧪 FASE 6: TESTES E DEPLOY

**Duração:** 3 dias
**Prioridade:** 🔴 CRÍTICA
**Objetivo:** Validar sistema e fazer deploy em produção

### DIA 18: Testes Multi-Tenant

#### 6.1 Teste: Detecção de Marca
- [ ] Forçar marca 'sesh' no código
- [ ] Recarregar página
- [ ] **Validar:** Logo, cores e produtos da Sesh aparecem
- [ ] Repetir para 'grupogot' e 'theog'

#### 6.2 Teste: Isolamento de Dados
- [ ] Executar query manual:
  ```sql
  SELECT p.name, b.slug
  FROM products p
  JOIN brands b ON b.id = p.brand_id;
  ```
- [ ] **Validar:** Produtos estão associados corretamente

#### 6.3 Teste: Checkout Completo (Sesh)
- [ ] Acessar site como marca Sesh
- [ ] Adicionar produto ao carrinho
- [ ] Ir para checkout
- [ ] Preencher dados
- [ ] Escolher PIX como pagamento
- [ ] Finalizar compra
- [ ] **Validar:**
  - Order criado no Supabase com `brand_id` da Sesh
  - Cobrança criada no Asaas
  - QR Code PIX gerado

#### 6.4 Teste: Checkout Completo (Grupo GOT)
- [ ] Repetir teste acima para marca Grupo GOT
- [ ] **Validar:** Dados isolados (não mistura com Sesh)

#### 6.5 Teste: Checkout Completo (The OG)
- [ ] Repetir teste acima para marca The OG

#### 6.6 Teste: RLS Policies
- [ ] Tentar acessar produto de outra marca via API:
  ```typescript
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', 'UUID_DE_PRODUTO_DE_OUTRA_MARCA');
  ```
- [ ] **Validar:** RLS bloqueia acesso (retorna vazio ou erro)

---

### DIA 19: Preparação para Deploy

#### 6.7 Configurar Variáveis de Produção
- [ ] Criar API Keys de produção no Asaas
- [ ] Atualizar brands no Supabase:
  ```sql
  UPDATE brands
  SET
    asaas_api_key = 'API_KEY_PRODUCAO',
    asaas_environment = 'production'
  WHERE slug = 'sesh';
  ```

#### 6.8 Configurar Domínios no Asaas
- [ ] Cadastrar domínios das marcas no Asaas
- [ ] Configurar webhooks:
  - URL: `https://seshstore.com.br/api/webhooks/asaas`
  - Events: payment.confirmed, payment.received

#### 6.9 Otimizar Build
- [ ] Executar `npm run build`
- [ ] Verificar tamanho do bundle
- [ ] Remover console.logs desnecessários
- [ ] **Validar:** Build < 1MB

#### 6.10 Criar Arquivo de Deploy
- [ ] Criar `vercel.json`:
  ```json
  {
    "routes": [
      {
        "src": "/(.*)",
        "dest": "/index.html"
      }
    ]
  }
  ```

---

### DIA 20: Deploy e Configuração de Domínios

#### 6.11 Deploy no Vercel
- [ ] Instalar Vercel CLI: `npm i -g vercel`
- [ ] Fazer login: `vercel login`
- [ ] Deploy: `vercel --prod`
- [ ] **Validar:** Deploy concluído com sucesso

#### 6.12 Configurar Variáveis de Ambiente no Vercel
- [ ] Acessar dashboard do Vercel
- [ ] Ir em Settings > Environment Variables
- [ ] Adicionar:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ASAAS_ENVIRONMENT=production`

#### 6.13 Adicionar Domínios no Vercel
- [ ] No dashboard, ir em Domains
- [ ] Adicionar:
  - `seshstore.com.br`
  - `www.seshstore.com.br`
  - `grupogot.com`
  - `www.grupogot.com`
  - `theog.com.br`
  - `www.theog.com.br`

#### 6.14 Configurar DNS
- [ ] Para cada domínio, adicionar CNAME:
  ```
  CNAME @ cname.vercel-dns.com
  CNAME www cname.vercel-dns.com
  ```
- [ ] Aguardar propagação (até 48h)

#### 6.15 Validar SSL
- [ ] Acessar cada domínio via HTTPS
- [ ] **Validar:** Certificado SSL ativo

#### 6.16 Testes em Produção
- [ ] Acessar `https://seshstore.com.br`
- [ ] **Validar:** Logo e tema da Sesh
- [ ] Acessar `https://grupogot.com`
- [ ] **Validar:** Logo e tema do Grupo GOT
- [ ] Acessar `https://theog.com.br`
- [ ] **Validar:** Logo e tema do The OG

#### 6.17 Teste de Compra Real
- [ ] Fazer compra teste com valor pequeno (R$ 1,00)
- [ ] Usar dados reais
- [ ] Pagar via PIX
- [ ] **Validar:** Pagamento aprovado no Asaas

#### 6.18 Configurar Webhooks Asaas
- [ ] No dashboard Asaas, ir em Integrações > Webhooks
- [ ] Adicionar endpoint: `https://seshstore.com.br/api/webhooks/asaas`
- [ ] Selecionar eventos:
  - `PAYMENT_CONFIRMED`
  - `PAYMENT_RECEIVED`
  - `PAYMENT_OVERDUE`

---

## ✅ VALIDAÇÃO FINAL

### Checklist de Go-Live
- [ ] **Banco de Dados**
  - [ ] Todas as tabelas criadas
  - [ ] RLS ativo em todas as tabelas
  - [ ] 3 marcas cadastradas
  - [ ] Produtos de teste inseridos

- [ ] **Frontend**
  - [ ] Detecção de marca funciona
  - [ ] Temas aplicam dinamicamente
  - [ ] Logos e favicons corretos
  - [ ] Hooks filtram por `brand_id`

- [ ] **Asaas**
  - [ ] Checkout cria cobrança
  - [ ] PIX gera QR Code
  - [ ] Boleto gera URL
  - [ ] Cartão processa (em sandbox)

- [ ] **Deploy**
  - [ ] 3 domínios configurados
  - [ ] DNS propagado
  - [ ] SSL ativo
  - [ ] Variáveis de ambiente configuradas

- [ ] **Testes**
  - [ ] Isolamento de dados validado
  - [ ] Checkout completo funciona
  - [ ] Webhooks recebendo notificações

---

## 📈 MÉTRICAS DE SUCESSO

- ✅ **3 marcas** operando no mesmo código
- ✅ **Dados 100% isolados** (brand_id + RLS)
- ✅ **Checkout funcional** com Asaas
- ✅ **Deploy único** servindo 3 domínios
- ✅ **Tempo de carregamento** < 2s
- ✅ **0 erros** no console do navegador
- ✅ **Escalabilidade:** Adicionar marca 4 = 1 dia de trabalho

---

## 🆘 TROUBLESHOOTING RÁPIDO

### Problema: Marca não detectada
**Solução:** Verificar mapeamento em `brand-detection.ts`

### Problema: Produtos de outra marca aparecem
**Solução:** Verificar se query tem `.eq('brand_id', brandUuid)`

### Problema: Erro 401 no Asaas
**Solução:** Verificar API Key em `.env.local`

### Problema: Tema não aplica
**Solução:** Verificar se `BrandProvider` está envolvendo o App

### Problema: Build falha
**Solução:** Executar `npm install` e verificar erros de TypeScript

---

**🎉 BOA SORTE NA IMPLEMENTAÇÃO!**

Este plano foi criado para ser executado passo a passo. Marque cada checkbox conforme completar as tarefas.

**Próximo Passo:** Começar pela **FASE 1, DIA 1** (Fundação do Banco de Dados)
