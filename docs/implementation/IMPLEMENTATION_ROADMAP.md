# 🚀 PLANO DE IMPLEMENTAÇÃO - SESH STORE MULTI-TENANT

**Data de Criação:** 29 de Janeiro de 2026
**Status:** Em Progresso
**Última Atualização:** 30 de Janeiro de 2026
**Objetivo:** Implementar as melhores práticas de e-commerce do PRD adaptadas ao projeto atual

## 📊 RESUMO DO PROGRESSO

### Prioridade 1 (Crítica)
- ✅ **Hooks com Brand Context:** 100% CONCLUÍDO
- ⚠️ **Integração Asaas:** 0% (Pendente)
- ✅ **UX do Carrinho:** 62% (5 de 8 itens)

### Prioridade 2 (Alta)
- ✅ **Feature Flags:** 100% CONCLUÍDO
- ✅ **VariantSelector:** 100% CONCLUÍDO
- ✅ **SEO Dinâmico:** 100% CONCLUÍDO

### Prioridade 3 (Média)
- 🔄 **Sistema de Notificações:** 0% (Pendente)
- 🔄 **Analytics:** 0% (Pendente)
- 🔄 **Wishlist:** 0% (Pendente)

---

## 📊 ANÁLISE DO PROJETO ATUAL

### ✅ JÁ IMPLEMENTADO (MUITO BOM!)

#### 1. **Banco de Dados Multi-Tenant** (CONCLUÍDO)✅
- ✅ Tabela `brands` completa com theme, features e settings em JSONB
- ✅ Todas as tabelas principais com `brand_id`
- ✅ Tabelas: products, product_images, product_variants, collections, banners, orders, order_items
- ✅ RLS (Row Level Security) ativado em TODAS as tabelas
- ✅ Soft delete implementado (campo `deleted_at`)
- ✅ Índices e foreign keys corretos
- ✅ 3 marcas cadastradas (Sesh, Grupo GOT, The OG)
- ✅ Produtos e coleções seed data para as 3 marcas (16 produtos, 6 coleções)

#### 2. **Sistema de Detecção de Marca** (CONCLUÍDO)✅
- ✅ Arquivo `src/config/brands.ts` com configurações completas
- ✅ Arquivo `src/lib/brand-detection.ts` com detecção por path/hostname
- ✅ Suporte a override via localStorage (para dev)
- ✅ 3 marcas configuradas: Sesh, Grupo GOT, The OG

#### 3. **Brand Context** (CONCLUÍDO)✅
- ✅ `BrandContext.tsx` implementado
- ✅ Hook `useBrand()` funcional
- ✅ Carrega dados do Supabase com fallback para config local
- ✅ Escuta mudanças de URL (hashchange)
- ✅ Expõe `brand`, `brandConfig`, `isLoading`, `error`

#### 4. **Hooks de Dados** (CONCLUÍDO)✅
- ✅ `useProducts` - com suporte opcional a brandId
- ✅ `useFeaturedProducts` - com suporte opcional a brandId
- ✅ `useProductsByCategory` - implementado
- ✅ `useSearchProducts` - implementado
- ✅ `useCollections` - implementado
- ✅ `useBanners` - implementado
- ✅ `useOrders` - implementado

#### 5. **Infraestrutura** (CONCLUÍDO)✅
- ✅ React Query configurado
- ✅ Zustand para carrinho (cartStore)
- ✅ Supabase client configurado
- ✅ TypeScript em todo o projeto

---

## 🎯 O QUE PRECISA SER IMPLEMENTADO

### 📌 PRIORIDADE 1: CRÍTICA (Fazer Primeiro)

#### 1. **Integração com Asaas** (Substituir Stripe)
**Motivo:** Payment gateway é fundamental para vendas

**Tarefas:**
- [ ] Criar `src/lib/asaas.ts` - Cliente HTTP da API Asaas
- [ ] Criar `src/types/asaas.ts` - Types TypeScript
- [ ] Criar `src/hooks/useAsaas.ts` - Hook para integração
- [ ] Criar `src/hooks/useCheckout.ts` - Fluxo completo de checkout
- [ ] Remover dependências do Stripe (`npm uninstall @stripe/stripe-js @stripe/react-stripe-js`)
- [ ] Deletar `src/lib/stripe.ts`
- [ ] Adicionar variáveis de ambiente Asaas
- [ ] Testar checkout com PIX, Boleto e Cartão (sandbox)

**Referência:** Spec linhas 1311-1617

---

#### 2. **Melhorar Hooks para Usar Brand Context Automaticamente** (CONCLUÍDO)✅
**Motivo:** Atualmente os hooks recebem `brandId` como parâmetro opcional, mas deveriam pegar automaticamente do contexto

**Mudanças em `src/hooks/useProducts.ts`:**
```typescript
// ANTES
export function useProducts(brandId?: string) {
  return useQuery({
    queryKey: ['products', brandId],
    // ...
  });
}

// DEPOIS
export function useProducts() {
  const { brand } = useBrand(); // ← Usar hook

  return useQuery({
    queryKey: ['products', brand?.id], // ← Usar ID do Supabase
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('...')
        .eq('brand_id', brand.id) // ← SEMPRE filtrar
        // ...
    },
  });
}
```

**Aplicar em:** (TODOS CONCLUÍDOS)✅
- [x] `useProducts` ✅
- [x] `useFeaturedProducts` ✅
- [x] `useProductsByCategory` ✅
- [x] `useSearchProducts` ✅
- [x] `useCollections` (useCategories) ✅
- [x] `useBanners` ✅
- [x] `useOrders` ✅

---

#### 3. **Otimizar UX do Carrinho e Checkout** (PARCIALMENTE CONCLUÍDO)
**Motivo:** Melhorar conversão de vendas

**Melhorias:**
- [x] Validar estoque antes de adicionar ao carrinho ✅ (StockWarning.tsx)
- [x] Mostrar aviso de estoque baixo ✅ (StockWarning.tsx)
- [ ] Implementar cálculo de frete real (integrar com Correios ou Melhor Envio)
- [x] Mostrar progresso de "falta X para frete grátis" ✅ (FreeShippingProgress.tsx)
- [x] Validar valor mínimo do pedido ✅ (MinOrderValueWarning.tsx)
- [ ] Adicionar timer de reserva de estoque (ex: "Seu carrinho expira em 15 minutos")
- [ ] Implementar cupons de desconto
- [ ] Melhorar validação de CEP com API ViaCEP

---

### 📌 PRIORIDADE 2: ALTA (Logo em Seguida)

#### 4. **Feature Flags Dinâmicos nos Componentes** (CONCLUÍDO)✅
**Motivo:** Personalizar experiência por marca

**Implementar verificações de `brand.features` em:**

**a) Parcelamento no Checkout:**
```typescript
// src/pages/Checkout.tsx
const { brandConfig } = useBrand();

{brandConfig.features.installments && (
  <InstallmentSelector max={brandConfig.settings.maxInstallments} />
)}
```

**b) Sistema de Avaliações:**
```typescript
// src/pages/ProductDetail.tsx
{brandConfig.features.reviews && (
  <ProductReviews productId={product.id} />
)}
```

**c) Gift Cards:**
```typescript
// src/pages/Cart.tsx
{brandConfig.features.giftCards && (
  <GiftCardInput onApply={handleGiftCard} />
)}
```

**d) Programa de Fidelidade:**
```typescript
// src/pages/Home.tsx
{brandConfig.features.loyalty && (
  <LoyaltyBanner />
)}
```

---

#### 5. **Componente Inteligente de Seleção de Variantes** (CONCLUÍDO)✅
**Motivo:** Melhorar UX na seleção de cor/tamanho

**Criar `src/components/VariantSelector.tsx`:**
```typescript
interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

export function VariantSelector({ variants, selectedVariant, onSelect }: VariantSelectorProps) {
  // Agrupar variantes por cor
  const colorGroups = groupBy(variants, 'color');

  // Estado
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Tamanhos disponíveis para a cor selecionada
  const availableSizes = selectedColor
    ? variants.filter(v => v.color === selectedColor && v.stock > 0)
    : [];

  return (
    <div>
      {/* Seletor de Cores */}
      <div className="flex gap-2">
        {Object.entries(colorGroups).map(([color, vars]) => (
          <button
            key={color}
            className={cn(
              "w-10 h-10 rounded-full border-2",
              selectedColor === color ? "border-primary" : "border-gray-300"
            )}
            style={{ backgroundColor: vars[0].color_hex }}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </div>

      {/* Seletor de Tamanhos */}
      {selectedColor && (
        <div className="flex gap-2 mt-4">
          {availableSizes.map(variant => (
            <button
              key={variant.id}
              className={cn(
                "px-4 py-2 border rounded",
                selectedSize === variant.size ? "border-primary" : "border-gray-300",
                variant.stock === 0 && "opacity-50 line-through"
              )}
              onClick={() => {
                setSelectedSize(variant.size);
                onSelect(variant);
              }}
              disabled={variant.stock === 0}
            >
              {variant.size}
            </button>
          ))}
        </div>
      )}

      {/* Aviso de Estoque */}
      {selectedVariant && selectedVariant.stock < 5 && selectedVariant.stock > 0 && (
        <p className="text-orange-600 text-sm mt-2">
          ⚠️ Restam apenas {selectedVariant.stock} unidades!
        </p>
      )}
    </div>
  );
}
```

---

#### 6. **SEO Dinâmico por Marca** (CONCLUÍDO)✅
**Motivo:** Melhorar posicionamento no Google

**Criar `src/components/SEOHead.tsx`:**
```typescript
import { Helmet } from 'react-helmet-async'; // Instalar: npm i react-helmet-async
import { useBrand } from '../contexts/BrandContext';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
}

export function SEOHead({ title, description, image, noindex }: SEOHeadProps) {
  const { brand, brandConfig } = useBrand();

  const fullTitle = title
    ? `${title} | ${brand?.name || brandConfig.name}`
    : brand?.name || brandConfig.name;

  const metaDescription = description || `Loja oficial ${brand?.name}`;
  const metaImage = image || brandConfig.theme.logo;

  return (
    <Helmet>
      {/* Título */}
      <title>{fullTitle}</title>

      {/* Meta Tags */}
      <meta name="description" content={metaDescription} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph (Facebook, WhatsApp) */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:type" content="website" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Favicon Dinâmico */}
      <link rel="icon" type="image/x-icon" href={brandConfig.theme.favicon} />

      {/* Tema Mobile (Chrome Android) */}
      <meta name="theme-color" content={brandConfig.theme.primaryColor} />
    </Helmet>
  );
}
```

**Usar nas páginas:**
```typescript
// src/pages/Home.tsx
export function Home() {
  return (
    <>
      <SEOHead
        title="Início"
        description="Descubra as melhores peças de streetwear"
      />
      {/* ... */}
    </>
  );
}

// src/pages/ProductDetail.tsx
export function ProductDetail() {
  const { product } = useProduct(id);

  return (
    <>
      <SEOHead
        title={product?.meta_title || product?.name}
        description={product?.meta_description || product?.description}
        image={product?.images?.[0]?.url}
      />
      {/* ... */}
    </>
  );
}
```

---

### 📌 PRIORIDADE 3: MÉDIA (Melhorias Incrementais)

#### 7. **Sistema de Notificações e Feedback**
**Motivo:** Melhorar comunicação com o usuário

**Criar `src/components/Toast.tsx`:**
```typescript
import { useEffect } from 'react';
import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto-remove após 5 segundos
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "p-4 rounded-lg shadow-lg flex items-center gap-3",
            toast.type === 'success' && "bg-green-500 text-white",
            toast.type === 'error' && "bg-red-500 text-white",
            toast.type === 'warning' && "bg-yellow-500 text-white",
            toast.type === 'info' && "bg-blue-500 text-white"
          )}
        >
          <p>{toast.message}</p>
          <button onClick={() => removeToast(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
```

**Usar no carrinho:**
```typescript
import { useToastStore } from '@/components/Toast';

function addToCart(product: Product) {
  const { addToast } = useToastStore.getState();

  // Adicionar produto
  cartStore.addItem(product);

  // Mostrar feedback
  addToast({
    type: 'success',
    message: `${product.name} adicionado ao carrinho!`,
  });
}
```

---

#### 8. **Analytics e Tracking**
**Motivo:** Entender comportamento dos usuários

**Criar `src/lib/analytics.ts`:**
```typescript
import { useBrand } from '@/contexts/BrandContext';

// Eventos personalizados
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  const { brand } = useBrand();

  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...properties,
      brand_id: brand?.id,
      brand_slug: brand?.slug,
    });
  }

  // Facebook Pixel (opcional)
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, properties);
  }
};

// Eventos pré-definidos
export const analytics = {
  // Produto visualizado
  viewProduct: (product: Product) => {
    trackEvent('view_item', {
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      category: product.category,
    });
  },

  // Adicionado ao carrinho
  addToCart: (product: Product, quantity: number) => {
    trackEvent('add_to_cart', {
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity,
    });
  },

  // Início do checkout
  beginCheckout: (cartTotal: number, itemCount: number) => {
    trackEvent('begin_checkout', {
      value: cartTotal,
      items: itemCount,
    });
  },

  // Compra finalizada
  purchase: (orderId: string, total: number, items: any[]) => {
    trackEvent('purchase', {
      transaction_id: orderId,
      value: total,
      items,
    });
  },
};
```

**Usar nos componentes:**
```typescript
// src/pages/ProductDetail.tsx
import { analytics } from '@/lib/analytics';

export function ProductDetail() {
  const { product } = useProduct(id);

  useEffect(() => {
    if (product) {
      analytics.viewProduct(product);
    }
  }, [product]);

  const handleAddToCart = () => {
    analytics.addToCart(product, quantity);
    // ...
  };
}
```

---

#### 9. **Sistema de Wishlist (Favoritos)**
**Motivo:** Aumentar engajamento e conversão

**Criar `src/stores/wishlistStore.ts`:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistStore {
  items: string[]; // IDs dos produtos
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId) => {
        set((state) => ({
          items: [...new Set([...state.items, productId])],
        }));
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((id) => id !== productId),
        }));
      },

      isInWishlist: (productId) => {
        return get().items.includes(productId);
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'wishlist-storage',
    }
  )
);
```

**Componente de botão:**
```typescript
// src/components/WishlistButton.tsx
import { Heart } from 'lucide-react';
import { useWishlistStore } from '@/stores/wishlistStore';

export function WishlistButton({ productId }: { productId: string }) {
  const { isInWishlist, addItem, removeItem } = useWishlistStore();
  const inWishlist = isInWishlist(productId);

  const handleToggle = () => {
    if (inWishlist) {
      removeItem(productId);
    } else {
      addItem(productId);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 hover:bg-gray-100 rounded-full transition"
      aria-label={inWishlist ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Heart
        className={cn(
          "w-6 h-6",
          inWishlist ? "fill-red-500 text-red-500" : "text-gray-400"
        )}
      />
    </button>
  );
}
```

---

### 📌 PRIORIDADE 4: BAIXA (Futuro)

#### 10. **Painel Administrativo Básico**
**Motivo:** Gerenciar produtos sem acessar Supabase diretamente

**Páginas:**
- `/admin/products` - Listar/criar/editar produtos
- `/admin/collections` - Gerenciar coleções
- `/admin/banners` - Gerenciar banners
- `/admin/orders` - Visualizar pedidos

**Autenticação:**
```typescript
// src/hooks/useAuth.ts
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user };
}
```

---

## 🛠️ ESTRUTURA DE ARQUIVOS FINAL

```
sesh-store/
├── src/
│   ├── lib/
│   │   ├── supabase.ts              ✅ Já existe
│   │   ├── asaas.ts                 🔴 CRIAR (Prioridade 1)
│   │   ├── analytics.ts             🟡 CRIAR (Prioridade 3)
│   │   ├── brand-detection.ts       ✅ Já existe
│   │   ├── queryClient.ts           ✅ Já existe
│   │   └── utils.ts                 ✅ Já existe
│   │
│   ├── config/
│   │   └── brands.ts                ✅ Já existe
│   │
│   ├── contexts/
│   │   └── BrandContext.tsx         ✅ Já existe
│   │
│   ├── hooks/
│   │   ├── useProducts.ts           ✅ JÁ MODIFICADO
│   │   ├── useCategories.ts         ✅ JÁ EXISTE (era useCollections)
│   │   ├── useBanners.ts            ✅ JÁ MODIFICADO
│   │   ├── useOrders.ts             ✅ JÁ MODIFICADO
│   │   ├── useFeatureFlag.ts        ✅ JÁ CRIADO
│   │   ├── useAsaas.ts              🔴 CRIAR (Prioridade 1)
│   │   ├── useCheckout.ts           🔴 CRIAR (Prioridade 1)
│   │   └── useAuth.ts               🟡 CRIAR (Prioridade 4)
│   │
│   ├── types/
│   │   └── asaas.ts                 🔴 CRIAR (Prioridade 1)
│   │
│   ├── components/
│   │   ├── BrandLink.tsx            ✅ Já existe
│   │   ├── VariantSelector.tsx      ✅ JÁ CRIADO
│   │   ├── SEOHead.tsx              ✅ JÁ CRIADO
│   │   ├── FeatureFlag.tsx          ✅ JÁ CRIADO
│   │   ├── ProductCard.tsx          ✅ JÁ CRIADO
│   │   ├── StockWarning.tsx         ✅ JÁ CRIADO
│   │   ├── FreeShippingProgress.tsx ✅ JÁ CRIADO
│   │   ├── MinOrderValueWarning.tsx ✅ JÁ CRIADO
│   │   ├── Toast.tsx                🟡 CRIAR (Prioridade 3)
│   │   └── WishlistButton.tsx       🟡 CRIAR (Prioridade 3)
│   │
│   ├── stores/
│   │   ├── cartStore.ts             ✅ Já existe
│   │   └── wishlistStore.ts         🟡 CRIAR (Prioridade 3)
│   │
│   └── pages/
│       ├── Home.tsx                 🟠 MODIFICAR (adicionar feature flags)
│       ├── ProductDetail.tsx        🟠 MODIFICAR (VariantSelector, SEO)
│       ├── Cart.tsx                 🟠 MODIFICAR (validações, gift cards)
│       └── Checkout.tsx             🔴 MODIFICAR (Asaas integration)
│
├── .env.local                       🟠 ATUALIZAR (adicionar Asaas keys)
├── package.json                     🟠 ATUALIZAR (remover Stripe, adicionar libs)
└── README.md                        🟡 ATUALIZAR (documentação)
```

**Legenda:**
- ✅ Já existe e está OK
- 🔴 Precisa criar (Prioridade Alta)
- 🟠 Precisa modificar (Prioridade Alta/Média)
- 🟡 Precisa criar/modificar (Prioridade Baixa)

---

## 📅 CRONOGRAMA SUGERIDO

### Semana 1: Fundação (Prioridade 1)
- **Dia 1-2:** Integração Asaas (criar cliente, types, hooks)
- **Dia 3:** Melhorar hooks para usar brand context automaticamente
- **Dia 4-5:** Implementar checkout com Asaas (PIX, Boleto, Cartão)

### Semana 2: UX e Features (Prioridade 2)
- **Dia 1:** Componente VariantSelector inteligente
- **Dia 2:** Feature flags dinâmicos (parcelamento, reviews, gift cards, loyalty)
- **Dia 3:** SEO dinâmico por marca
- **Dia 4:** Validações de carrinho (estoque, valor mínimo, frete grátis)
- **Dia 5:** Testes e ajustes

### Semana 3: Melhorias (Prioridade 3)
- **Dia 1:** Sistema de notificações (Toast)
- **Dia 2:** Analytics e tracking
- **Dia 3:** Wishlist/Favoritos
- **Dia 4-5:** Testes e otimizações

### Futuro: Admin e Avançado (Prioridade 4)
- Painel administrativo
- Autenticação completa
- PWA
- Multi-idioma

---

## 🎯 CHECKLIST DE VALIDAÇÃO

### ✅ Funcionalidades Essenciais
- [ ] Detecção de marca funciona (localhost com prefixo `/sesh`, `/grupogot`, `/theog`)
- [ ] Produtos filtrados por `brand_id` automaticamente
- [ ] Temas (cores, logo, favicon) aplicam dinamicamente
- [ ] Checkout completo com Asaas (PIX, Boleto, Cartão)
- [ ] Feature flags funcionam (parcelamento, reviews, etc.)
- [ ] SEO tags dinâmicas por marca e página

### ✅ Performance
- [ ] Queries cacheadas com React Query
- [ ] Imagens otimizadas (lazy loading)
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 90

### ✅ Segurança
- [ ] RLS policies ativas no Supabase
- [ ] API Keys em variáveis de ambiente
- [ ] Validação de formulários com Zod
- [ ] HTTPS em produção

### ✅ UX
- [ ] Feedback visual em todas as ações
- [ ] Loading states em requisições
- [ ] Error handling apropriado
- [ ] Responsivo em mobile/tablet/desktop

---

## 📚 RECURSOS E DOCUMENTAÇÃO

### APIs Externas
- **Asaas Docs:** https://docs.asaas.com/reference
- **ViaCEP:** https://viacep.com.br
- **Melhor Envio:** https://melhorenvio.com.br/developers

### Bibliotecas Recomendadas
```bash
# Instalar
npm install react-helmet-async  # SEO dinâmico
npm install react-hot-toast      # Notificações (alternativa ao nosso Toast)
npm install @hookform/resolvers  # ✅ Já instalado
npm install zod                  # ✅ Já instalado

# Remover
npm uninstall @stripe/stripe-js @stripe/react-stripe-js
```

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **Começar pela Prioridade 1:** Integração Asaas
2. **Testar em Sandbox:** Fazer compra teste completa
3. **Melhorar Hooks:** Usar brand context automaticamente
4. **Feature Flags:** Implementar nos componentes principais
5. **SEO:** Adicionar meta tags dinâmicas

---

**Documento criado por:** Claude Code
**Última atualização:** 29/01/2026

Este plano é adaptado especificamente para o Sesh Store, aproveitando o que já está implementado e focando no que realmente agrega valor ao projeto! 🎯
