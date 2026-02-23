# Diagnóstico: Skeletons Infinitos Após Hard Refresh

**Data:** 2026-02-22
**Problema:** Após Ctrl+Shift+R, o site fica preso em loading infinito. Header funciona, mas produtos, banners e categorias nunca carregam.

---

## 1. Código Completo das Páginas Afetadas

### 1.1 HomePage (src/app/App.tsx:1871–2307)

```tsx
const HomePage = () => {
  const { brand, brandConfig, isLoading: brandLoading } = useBrand();
  const { primaryColor } = useBrandColors();
  const { user } = useAuth();
  const { data: heroCollection } = useHeroCollection();
  const { data: featuredProducts } = useFeaturedProducts();
  const navigate = useBrandNavigate();
  const { data: tabacariaCategories, isLoading: tabacariaLoading } = useTabacariaCategories();
  const { data: banners } = useBanners();

  const visibleFeaturedProducts = useMemo(() => {
    return (featuredProducts || []).filter((product: any) => !product.is_tabaco || user);
  }, [featuredProducts, user]);

  const visibleTabacariaCategories = useMemo(() => {
    if (!tabacariaCategories) return [];
    if (user) return tabacariaCategories;
    return tabacariaCategories.filter((cat) => !cat.is_tabacaria);
  }, [tabacariaCategories, user]);

  useApplyBrandTheme();

  React.useEffect(() => {
    if (banners && banners.length > 0) {
      banners.forEach((banner) => {
        if (banner.image_url) {
          const img = new Image();
          img.src = banner.image_url;
        }
        if (banner.mobile_image_url) {
          const img = new Image();
          img.src = banner.mobile_image_url;
        }
      });
    }
  }, [banners]);

  // ★★★ PONTO CRÍTICO ★★★
  const isLoading = brandLoading;  // linha 1913

  const brandName = brand?.name || brandConfig.name || 'Sesh Store';
  const displayName = brandName.split(' ')[0].toUpperCase();

  // ★★★ EARLY RETURN COM LOADING SPINNER ★★★
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
               style={{ borderColor: primaryColor }}></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <main>
      {/* Hero Banner */}
      {heroCollection && ( /* ... hero content ... */ )}
      {/* Marquee */}
      {/* Destaques (featuredProducts) */}
      {visibleFeaturedProducts && visibleFeaturedProducts.length > 0 && ( /* ... */ )}
      {/* Banners dinâmicos */}
      {banners && banners.length > 0 && banners.map((banner) => ( /* ... */ ))}
      {/* Tabacaria */}
      {visibleTabacariaCategories && visibleTabacariaCategories.length > 0 && ( /* ... */ )}
      {/* Quem Somos + FAQ */}
    </main>
  );
};
```

### 1.2 ProductListPage (src/app/App.tsx:2309–2708+)

```tsx
const ProductListPage = () => {
  const location = useLocation();
  const { primaryColor } = useBrandColors();
  const { brand } = useBrand();          // ← NÃO desestrutura isLoading
  const { user } = useAuth();
  const { searchQuery, clearSearch } = useSearch();

  const searchParams = new URLSearchParams(location.search);
  const categorySlug = searchParams.get('category');
  const collectionSlug = searchParams.get('collection');

  // Buscar produtos do banco de dados
  const { data: allProducts, isLoading: loadingAll } = useProducts();
  const { data: categoryProducts, isLoading: loadingCategory } = useProductsByCategorySlug(categorySlug || '');
  const { data: collectionProducts, isLoading: loadingCollection } = useProductsByCollectionSlug(collectionSlug || '');
  const { data: rawCategories } = useCategoryTree();

  const { products: searchResults, isLoading: loadingSearch, isSearching } = useFuzzySearch(searchQuery);

  // ... filtros, etc ...

  // ★★★ PONTO CRÍTICO — isLoading vem dos hooks de DADOS, não do brand ★★★
  const isLoading = isSearching
    ? loadingSearch
    : (collectionSlug ? loadingCollection : (categorySlug ? loadingCategory : loadingAll));

  // ... filtros e sorting ...

  // ★★★ EARLY RETURN COM SKELETON ★★★
  if (isLoading) {
    return <ShopPageSkeleton />;
  }

  return ( /* ... grid de produtos ... */ );
};
```

### 1.3 ProductDetailPage (src/app/App.tsx:2938–3707)

```tsx
const ProductDetailPage = () => {
  const { id } = useParams();
  const { brand } = useBrand();          // ← NÃO desestrutura isLoading
  const { user } = useAuth();
  const { data: product, isLoading, error } = useProduct(id || '');

  // ★★★ isLoading vem do useProduct — enabled: !!id (NÃO depende de brand.id) ★★★
  if (isLoading) {
    return <ProductDetailSkeleton />;
  }
  // ...
};
```

---

## 2. Output dos Greps — Mapeamento de Dependências

### 2.1 brandLoading / isLoading brand em App.tsx

```
src/app/App.tsx:1872:  const { brand, brandConfig, isLoading: brandLoading } = useBrand();
src/app/App.tsx:1913:  const isLoading = brandLoading;
```

**Conclusão:** Apenas a `HomePage` extrai e usa `isLoading` (renomeado `brandLoading`) do `useBrand()`. A `ProductListPage` e `ProductDetailPage` NÃO usam `isLoading` do BrandContext.

### 2.2 Condições `enabled:` em todos os hooks

| Hook | Arquivo | Condição `enabled` |
|------|---------|-------------------|
| `useProducts` | useProducts.ts:34 | `!!brand?.id` |
| `useProduct` | useProducts.ts:71 | `!!id` (NÃO depende de brand) |
| `useProductsByCategorySlug` | useProducts.ts:145 | `!!categorySlug && !!brand?.id` |
| `useProductsByCategory` | useProducts.ts:175 | `!!category && !!brand?.id` |
| `useFeaturedProducts` | useProducts.ts:208 | `!!brand?.id` |
| `useSearchProducts` | useProducts.ts:268 | `query.length > 2 && !!brand?.id` |
| `useBanners` | useBanners.ts:43 | `!!brand?.id` |
| `useHeroBanner` | useBanners.ts:72 | `!!brand?.id` |
| `useCategories` | useCategories.ts:80 | `!!brand?.id` |
| `useCategoryTree` | useCategories.ts:109 | `!!brand?.id` |
| `useMenuCategories` | useCategories.ts:139 | `!!brand?.id` |
| `useFeaturedCategories` | useCategories.ts:169 | `!!brand?.id` |
| `useTabacariaCategories` | useCategories.ts:277 | `!!brand?.id` |
| `useHeroCollection` | useCollections.ts:52 | `!!brand?.id` |
| `useProductsByCollectionSlug` | useCollections.ts:140 | `!!collectionSlug && !!brand?.id` |
| `useFavorites` | useFavorites.ts:36 | `!!user?.id && !!brand?.id` |
| `useFAQs` | useFAQs.ts:36 | `!!brand?.id` |
| `useFooterLinks` | useFooterLinks.ts:37 | `!!brand?.id` |

### 2.3 Skeleton/Loading renders em App.tsx

```
src/app/App.tsx:58:  import { ProductDetailSkeleton }
src/app/App.tsx:59:  import { ShopPageSkeleton }
src/app/App.tsx:2508: return <ShopPageSkeleton />;           ← ProductListPage
src/app/App.tsx:3174: return <ProductDetailSkeleton />;      ← ProductDetailPage
src/app/App.tsx:1919: if (isLoading) { return <spinner> }    ← HomePage
```

### 2.4 brand?.id checks em App.tsx

**Nenhum** `brand?.id` ou `brand.id` aparece diretamente no App.tsx. As verificações de `brand?.id` são todas dentro dos hooks.

### 2.5 Auth loading checks em App.tsx

**Nenhuma** referência a `loading.*auth`, `authLoading`, ou `auth.*loading` no App.tsx. O auth `loading` NÃO bloqueia rendering de nenhuma página diretamente.

### 2.6 BrandContext.tsx (completo)

```tsx
// (ver seção 3 para análise detalhada)
// Estado inicial:
const cachedBrand = getCachedBrand(initialSlug);              // sessionStorage
const [brand, setBrand] = useState<Brand | null>(cachedBrand); // null se sem cache
const [isLoading, setIsLoading] = useState(!cachedBrand);      // true se sem cache
```

---

## 3. Timeline Passo-a-Passo: Hard Refresh em `/sesh/shop` (Logado)

### Cenário A: sessionStorage TEM cache (caso mais comum)

Hard refresh (Ctrl+Shift+R) **NÃO limpa sessionStorage**. Só limpa o cache HTTP do browser.

```
T=0ms  React monta App
       ├── QueryClientProvider → React Query inicializa (sem cache — é in-memory)
       ├── HashRouter
       └── BrandProvider monta:
            ├── getCurrentBrand() → 'sesh'
            ├── getCachedBrand('sesh') → ✅ RETORNA brand do sessionStorage
            ├── brand = cachedBrand (com id válido, ex: "abc-123")
            ├── isLoading = false (porque cachedBrand existe)
            └── Dispara loadBrand('sesh') no useEffect

T=1ms  AuthProvider monta:
       ├── loading = true
       └── Dispara initializeAuth() no useEffect
            ├── getSession() → busca token do localStorage
            └── getUser() → valida token com servidor (LENTO — 200-2000ms)

T=2ms  SearchProvider monta

T=3ms  Header renderiza (OK — usa useBrand, brand já tem dados)

T=5ms  ProductListPage monta (rota /sesh/shop):
       ├── useBrand() → { brand: { id: "abc-123", ... }, isLoading: false }
       ├── useAuth() → { user: null, loading: true }
       ├── useProducts() → enabled: !!brand?.id → ✅ TRUE → DISPARA QUERY
       ├── useCategoryTree() → enabled: !!brand?.id → ✅ TRUE → DISPARA QUERY
       ├── isLoading (local) = loadingAll → true (query ainda pendente)
       └── Renderiza <ShopPageSkeleton />

T=100-500ms  useProducts resolve → dados chegam
       ├── loadingAll = false
       ├── isLoading (local) = false
       └── RE-RENDERIZA com produtos ✅

T=200-2000ms  AuthProvider resolve:
       ├── loading = false, user = { id: "..." }
       └── Queries que dependem de user?.id (favoritos) disparam
```

**RESULTADO CENÁRIO A: FUNCIONA CORRETAMENTE.** A página carrega normalmente porque sessionStorage tem o brand cached com ID válido.

### Cenário B: sessionStorage NÃO tem cache (ex: primeira visita, ou sessionStorage limpo)

```
T=0ms  React monta App
       └── BrandProvider monta:
            ├── getCurrentBrand() → 'sesh'
            ├── getCachedBrand('sesh') → ❌ NULL
            ├── brand = null
            ├── isLoading = true
            └── Dispara loadBrand('sesh')
                 ├── Sem cache → setIsLoading(true)
                 └── fetchBrandFromDB('sesh') → faz fetch HTTP

T=1ms  AuthProvider monta:
       ├── loading = true
       └── Dispara initializeAuth()

T=3ms  ProductListPage monta:
       ├── useBrand() → { brand: null, isLoading: true }
       ├── useProducts() → enabled: !!brand?.id → !!null?.id → ❌ FALSE
       ├── useCategoryTree() → enabled: !!brand?.id → ❌ FALSE
       ├── loadingAll = false (query desabilitada, React Query retorna isLoading: false quando enabled: false)
       │   ★★★ ATENÇÃO: React Query v5 retorna isPending: true mas isLoading: false quando enabled: false
       │   React Query v4 retorna isLoading: true quando enabled: false
       │   Comportamento depende da versão!
       ├── isLoading (local) = loadingAll → DEPENDE DA VERSÃO DO REACT QUERY
       └── Se isLoading = false → renderiza lista VAZIA (0 produtos)
           Se isLoading = true → renderiza <ShopPageSkeleton /> indefinidamente

T=200-1000ms  fetchBrandFromDB resolve → brand recebe dados do DB
       ├── setBrand(data) → brand.id agora é "abc-123"
       ├── setIsLoading(false)
       └── React re-renderiza:
            ├── useProducts() → enabled: !!brand?.id → ✅ TRUE → DISPARA QUERY
            └── Produtos carregam normalmente
```

### Cenário C: fetchBrandFromDB FALHA (rede lenta, timeout, Supabase down)

```
T=0ms  BrandProvider monta:
       ├── brand = null (sem cache)
       ├── isLoading = true

T=3ms  ProductListPage monta:
       ├── brand = null → queries desabilitadas
       └── ShopPageSkeleton (se isLoading = true do React Query)

T=8000ms  fetchBrandFromDB faz TIMEOUT (QUERY_TIMEOUT = 8000ms)
       ├── Fallback ativado:
       │   setBrand({ id: '', slug: 'sesh', ... })  ← ★★★ id = '' (VAZIO) ★★★
       ├── setIsLoading(false)

T=8001ms  Re-render:
       ├── brand = { id: '', slug: 'sesh', ... }
       ├── useProducts() → enabled: !!brand?.id → !!'' → ❌ FALSE
       ├── useCategoryTree() → enabled: !!brand?.id → !!'' → ❌ FALSE
       └── ★★★ QUERIES NUNCA DISPARAM ★★★

T=8002ms  isLoading (ProductListPage):
       ├── loadingAll depende da versão do React Query
       ├── Se React Query v5: loadingAll = false → lista vazia renderizada
       ├── Se React Query v4: loadingAll = true → ★★★ SKELETON INFINITO ★★★

T=11000ms  Retry (3s após falha):
       ├── Se retry TAMBÉM falha → estado permanece com id = ''
       └── ★★★ TRAVADO PERMANENTEMENTE ★★★
```

---

## 4. Identificação Exata do Ponto de Bloqueio

### 4.1 O `brand.id` que chega no `useProducts` no momento do mount

**Depende do cenário:**

| Cenário | `brand?.id` no mount | Resultado |
|---------|---------------------|-----------|
| Cache existe (sessionStorage) | `"uuid-real"` | Queries disparam ✅ |
| Sem cache, fetch OK | `undefined` (brand é null) → depois `"uuid-real"` | Queries disparam após fetch ✅ |
| Sem cache, fetch FALHA | `undefined` → depois `""` (string vazia) | ★★★ Queries NUNCA disparam ★★★ |

### 4.2 Existe algum componente que condiciona render em `auth.loading`?

**NÃO.** Nenhuma das páginas (HomePage, ProductListPage, ProductDetailPage) faz early return baseado em `auth.loading`. O auth NÃO bloqueia rendering.

### 4.3 A correção do `isLoading = brandLoading` foi aplicada em todas as páginas?

**NÃO.**

| Página | Usa `brandLoading` para early return? | Loading vem de onde? |
|--------|---------------------------------------|---------------------|
| **HomePage** (linha 1913) | ✅ SIM — `const isLoading = brandLoading` | `useBrand().isLoading` |
| **ProductListPage** (linha 2359) | ❌ NÃO | `useProducts().isLoading`, `useProductsByCategorySlug().isLoading`, etc. |
| **ProductDetailPage** (linha 3173) | ❌ NÃO | `useProduct().isLoading` |

### 4.4 Existe `if (isLoading) return <Skeleton>` que NUNCA sai de loading?

**SIM — na ProductListPage, linha 2507-2508.**

```tsx
// ProductListPage — linha 2359
const isLoading = isSearching
  ? loadingSearch
  : (collectionSlug ? loadingCollection : (categorySlug ? loadingCategory : loadingAll));

// Linha 2507-2508
if (isLoading) {
  return <ShopPageSkeleton />;
}
```

**O problema:**

O `loadingAll` vem de `useProducts()`. Quando `enabled: false` (porque `brand?.id` é falsy):

- **React Query v5 (`@tanstack/react-query` v5.x):** `isLoading = false`, `isPending = true`, `status = 'pending'`, `fetchStatus = 'idle'`
  → Resultado: lista vazia é renderizada, NÃO skeleton infinito

- **React Query v4 (`@tanstack/react-query` v4.x):** `isLoading = true` quando `enabled: false` e não há dados
  → Resultado: ★★★ **SKELETON INFINITO** ★★★

**Versão instalada: `@tanstack/react-query` v5.90.19 (React Query v5).**

No React Query v5, quando `enabled: false`:
- `isLoading = false` (não mostra skeleton)
- `isPending = true`
- `status = 'pending'`
- `fetchStatus = 'idle'`
- `data = undefined`

**Portanto, no ProductListPage:** `loadingAll = false` → o skeleton desaparece → renderiza lista com 0 produtos (vazia). Não é skeleton infinito, é **lista vazia permanente** — que pode ser confundida com "dados nunca carregam".

### 4.5 Causa Raiz Identificada

**A causa raiz é a combinação de DOIS problemas:**

1. **BrandContext fallback com `id: ''`** (linha 107 de BrandContext.tsx):
   ```tsx
   setBrand({
     id: '',            // ← STRING VAZIA — !!'' === false
     slug: config.slug,
     name: config.name,
     // ...
   });
   ```
   Quando o fetch falha, o brand recebe `id: ''`. Como `!!'' === false`, todas as queries com `enabled: !!brand?.id` ficam **permanentemente desabilitadas**.

2. **React Query: `isLoading` quando `enabled: false`** depende da versão:
   - v4: `isLoading = true` → skeleton infinito
   - v5: `isLoading = false` → lista vazia (sem skeleton, mas sem dados)

   Em AMBOS os casos, os dados nunca chegam. A diferença é se o usuário vê skeleton ou lista vazia.

---

## 5. Console.log para Debug (NÃO committar)

### 5.1 BrandContext.tsx — dentro do BrandProvider, após os useState:

```typescript
useEffect(() => {
  console.log('[DIAG] BrandContext state:', {
    brandId: brand?.id,
    brandSlug: brand?.slug,
    isLoading,
    hasCachedBrand: !!getCachedBrand(getCurrentBrand()),
    currentSlug
  });
}, [brand, isLoading, currentSlug]);
```

### 5.2 AuthContext.tsx — dentro do AuthProvider, após os useState:

```typescript
useEffect(() => {
  console.log('[DIAG] AuthContext state:', {
    userId: user?.id,
    hasSession: !!session,
    loading
  });
}, [user, session, loading]);
```

### 5.3 ProductListPage — no início do componente (após hooks):

```typescript
console.log('[DIAG] ProductListPage render:', {
  brandId: brand?.id,
  brandIdType: typeof brand?.id,
  brandIdTruthy: !!brand?.id,
  loadingAll,
  loadingCategory,
  loadingCollection,
  isLoading,
  allProductsCount: allProducts?.length,
  categoriesCount: rawCategories?.length,
});
```

### 5.4 Output Esperado do Console (simulação)

**Cenário normal (cache existe):**
```
[DIAG] BrandContext state: { brandId: "abc-123-...", brandSlug: "sesh", isLoading: false, hasCachedBrand: true, currentSlug: "sesh" }
[DIAG] AuthContext state: { userId: undefined, hasSession: false, loading: true }
[DIAG] ProductListPage render: { brandId: "abc-123-...", brandIdType: "string", brandIdTruthy: true, loadingAll: true, ... }
[DIAG] ProductListPage render: { brandId: "abc-123-...", ..., loadingAll: false, allProductsCount: 42, ... }
[DIAG] AuthContext state: { userId: "user-456-...", hasSession: true, loading: false }
```

**Cenário problema (fetch falha):**
```
[DIAG] BrandContext state: { brandId: undefined, brandSlug: undefined, isLoading: true, hasCachedBrand: false, currentSlug: "sesh" }
[DIAG] ProductListPage render: { brandId: undefined, brandIdTruthy: false, loadingAll: true/false, allProductsCount: undefined, ... }
// ... 8 segundos depois ...
[DIAG] BrandContext state: { brandId: "", brandSlug: "sesh", isLoading: false, hasCachedBrand: false, currentSlug: "sesh" }
[DIAG] ProductListPage render: { brandId: "", brandIdType: "string", brandIdTruthy: false, loadingAll: ???, allProductsCount: undefined, ... }
// ★★★ NUNCA MAIS MUDA — TRAVADO ★★★
```

> **NOTA:** O output real do console só pode ser obtido rodando o dev server com os console.log injetados e fazendo hard refresh no browser. A simulação acima é baseada na análise estática do código.

---

## 6. Proposta de Correção (NÃO aplicar)

### Correção 1 (PRINCIPAL): BrandContext fallback — usar ID sintético em vez de string vazia

```tsx
// BrandContext.tsx, linha ~107
// ANTES (BUGADO):
setBrand({
  id: '',  // ← !!'' === false, queries nunca disparam
  slug: config.slug,
  ...
});

// DEPOIS (CORRIGIDO):
setBrand({
  id: `local-${config.slug}`,  // ← !!'local-sesh' === true, queries disparam
  slug: config.slug,
  ...
});
```

**Problema:** IDs sintéticos farão as queries dispararem mas retornarão 0 resultados do Supabase (não existe brand com id `local-sesh`). Precisamos de uma abordagem melhor.

### Correção 2 (MELHOR): Buscar o brand.id real pelo slug

O fallback local não tem o UUID real do brand. A solução correta é:

```tsx
// BrandContext.tsx — loadBrand, no bloco catch
if (!cached) {
  const config = getBrandConfig(slug);
  // Definir brand com dados locais MAS manter isLoading = true
  // E agendar retries mais agressivos
  setBrand({
    id: '',
    slug: config.slug,
    ...
  });
  // NÃO setar isLoading = false aqui — manter loading até ter ID real
}
```

### Correção 3 (RECOMENDADA): Modificar os hooks para usar `brand?.slug` como fallback

A maioria das tabelas filtra por `brand_id`, que precisa do UUID. Não dá para usar slug.

### Correção 4 (PRAGMÁTICA — RECOMENDADA):

Modificar o `ProductListPage` e `ProductDetailPage` para detectar o cenário "brand sem ID" e mostrar estado apropriado:

```tsx
// ProductListPage — adicionar ANTES do isLoading check
const { brand, isLoading: brandLoading } = useBrand();

// Se brand existe mas sem ID válido, mostrar loading (não skeleton infinito)
if (brandLoading || (brand && !brand.id)) {
  return <ShopPageSkeleton />;
}
```

**Porém isso NÃO resolve o problema de fundo** — se o fetch falhou e o retry também, ficará em skeleton para sempre.

### Correção 5 (DEFINITIVA — RECOMENDADA):

1. **No BrandContext**: Quando o fallback local é usado (id = ''), disparar retries **contínuos** (exponential backoff) até conseguir o ID real:

```tsx
// Após definir brand com id vazio
let retryCount = 0;
const maxRetries = 5;
const retryWithBackoff = () => {
  if (retryCount >= maxRetries || loadIdRef.current !== loadId) return;
  const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
  setTimeout(async () => {
    try {
      const data = await fetchBrandFromDB(slug);
      if (loadIdRef.current === loadId) {
        setBrand(data);
        setCachedBrand(slug, data);
      }
    } catch {
      retryCount++;
      retryWithBackoff();
    }
  }, delay);
};
retryWithBackoff();
```

2. **Nos hooks**: Adicionar fallback para quando `brand?.id` é string vazia — ou melhor, fazer o BrandContext **nunca expor** um brand com `id: ''`. Se não tem ID, manter `brand = null` e `isLoading = true` até resolver.

### Correção 6 (MAIS SIMPLES E EFICAZ):

**Nunca setar `isLoading = false` se brand.id ficou vazio:**

```tsx
// BrandContext.tsx, bloco catch, linha ~104-118
if (!cached) {
  const config = getBrandConfig(slug);
  setBrand({
    id: '',
    slug: config.slug,
    name: config.name,
    domain: config.domain,
    theme: config.theme,
    features: config.features,
    settings: config.settings,
    active: true,
  });
  setCurrentSlug(slug);
}
// NÃO chamar setIsLoading(false) aqui!
// Manter isLoading = true para que HomePage mostre spinner
// e o retry de 3s tente resolver
```

**Porém**: ProductListPage e ProductDetailPage NÃO checam `brandLoading`, então esse fix só funciona na HomePage.

### Resumo da Correção Recomendada (3 passos):

| Passo | Arquivo | O que fazer |
|-------|---------|-------------|
| 1 | `BrandContext.tsx` | Quando fallback local é usado (sem cache + fetch falhou), **NÃO** setar `isLoading = false`. Manter loading até retry ter sucesso ou esgotar tentativas. Após esgotar, setar um estado `error` visível. |
| 2 | `App.tsx` ProductListPage (~linha 2312) | Desestruturar `isLoading: brandLoading` do `useBrand()` e incluir na condição de loading: `const isLoading = brandLoading \|\| (isSearching ? loadingSearch : ...)` |
| 3 | `App.tsx` ProductDetailPage (~linha 2944) | Idem: extrair `isLoading: brandLoading` e adicioná-lo ao check de loading |

---

## Resumo Executivo

| Item | Status |
|------|--------|
| **Causa raiz** | `BrandContext` seta `brand.id = ''` (string vazia) no fallback quando fetch falha. `!!'' === false` desabilita TODAS as queries React Query. |
| **Por que o Header funciona** | Header usa `brand?.name`, `brand?.slug`, `brandConfig` — nenhum depende de `brand.id` ser truthy. |
| **Por que é intermitente** | Depende do sessionStorage ter cache válido. Se tem, funciona. Se não tem E o fetch falha (rede, timeout, Supabase), trava. |
| **HomePage** | Protegida parcialmente pelo `if (brandLoading) return <spinner>`, mas se o fetch falha e `isLoading` vira `false`, os dados nunca carregam (seções ficam vazias, não skeleton). |
| **ProductListPage** | NÃO protegida pelo `brandLoading`. O `isLoading` local vem do React Query v5. Com `enabled: false`, `isLoading = false` → renderiza lista vazia (0 produtos). Se brand resolve depois, queries disparam e dados carregam. Se brand fica com `id = ''`, **lista vazia permanente**. |
| **ProductDetailPage** | `useProduct` tem `enabled: !!id` (NÃO depende de brand.id), então pode funcionar parcialmente. Mas o `brand?.id` é usado para filtro de segurança. |
| **Fix mais simples** | Garantir que BrandContext NUNCA exponha `brand` com `id: ''`. Se não tem ID real, manter `brand = null` e `isLoading = true`. |
