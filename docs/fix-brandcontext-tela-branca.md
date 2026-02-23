# Correção Crítica — BrandContext: Tela Branca ao Limpar Cache

**Prioridade:** 🔴 Urgente — afeta qualquer usuário novo ou que limpou dados do navegador.

## O Problema

Quando o usuário não tem cache (sessionStorage vazio) — seja por primeira visita, limpeza de dados do navegador, ou aba anônima — o site renderiza o Header e mais nada. Tela branca. Nenhum produto, banner, categoria ou coleção carrega.

### Causa raiz

No `src/contexts/BrandContext.tsx`, a função `loadBrand` cria um brand temporário com `id: ''` (string vazia) enquanto busca os dados reais do banco:

```typescript
setBrand({
  id: '',  // ← PROBLEMA: string vazia é falsy
  slug: config.slug,
  ...
});
setIsLoading(false);  // ← PROBLEMA: marca como "pronto" antes do fetch
```

Todos os hooks de dados (`useProducts`, `useFeaturedProducts`, `useMenuCategories`, `useBanners`, `useHeroCollection`, `useCategories`, etc.) têm:

```typescript
enabled: !!brand?.id  // '' é falsy → query NUNCA roda
```

O fetch do banco acontece em background, mas como `isLoading` já é `false`, a HomePage renderiza com dados vazios. Se o fetch falhar (timeout, rede lenta), fica vazio pra sempre.

---

## O que fazer

### Passo 1 — Mapear o fluxo atual

Antes de alterar, leia e entenda o fluxo completo do `src/contexts/BrandContext.tsx`:

1. `loadBrand` é chamado no mount
2. Tenta pegar do `sessionStorage` (cache)
3. Se não tem cache, cria brand temporário do `BRAND_CONFIGS` local
4. Faz fetch do banco em background
5. Se fetch OK, atualiza brand com dados reais e salva no cache
6. Se fetch falha, mantém o temporário (que tem `id: ''`)

### Passo 2 — Corrigir `src/contexts/BrandContext.tsx`

A correção tem 3 partes:

#### 2.1 — Manter `isLoading: true` até ter brand com id válido

Quando NÃO há cache, o brand temporário não serve pra nada (queries não rodam com `id: ''`). Então manter loading até o fetch completar.

```diff
  const loadBrand = useCallback(async (slug: string) => {
    const loadId = ++loadIdRef.current;

    const cached = getCachedBrand(slug);
    if (cached) {
+     // Cache existe — usar imediatamente, sem loading
      setBrand(cached);
+     setCurrentSlug(slug);
+     setIsLoading(false);
    } else {
-     const config = getBrandConfig(slug);
-     setBrand({
-       id: '',
-       slug: config.slug,
-       name: config.name,
-       domain: config.domain,
-       theme: config.theme,
-       features: config.features,
-       settings: config.settings,
-       active: true,
-     });
+     // Sem cache — manter loading enquanto busca do banco
+     setIsLoading(true);
    }
-   setCurrentSlug(slug);
-   setIsLoading(false);

    try {
      const data = await fetchBrandFromDB(slug);
      if (loadId !== loadIdRef.current) return;

      setBrand(data);
      setCurrentSlug(slug);
      setError(null);
      setCachedBrand(slug, data);
+     setIsLoading(false);
    } catch {
      if (loadId !== loadIdRef.current) return;
      console.warn(`[BrandContext] DB update falhou para "${slug}", usando dados locais.`);
+
+     // Se não tinha cache E o fetch falhou, usar config local como fallback
+     // MAS com um id baseado no slug para que as queries pelo menos tentem rodar
+     if (!cached) {
+       const config = getBrandConfig(slug);
+       setBrand({
+         id: '',
+         slug: config.slug,
+         name: config.name,
+         domain: config.domain,
+         theme: config.theme,
+         features: config.features,
+         settings: config.settings,
+         active: true,
+       });
+       setCurrentSlug(slug);
+     }
+     setIsLoading(false);
    }
  }, [fetchBrandFromDB]);
```

**Resumo da mudança:**
- Com cache → usa imediato, `isLoading: false` na hora
- Sem cache → `isLoading: true` até fetch completar
- Fetch OK → seta brand real, `isLoading: false`
- Fetch falhou sem cache → seta fallback local, `isLoading: false` (site mostra tema correto mas sem dados do banco — melhor que tela branca infinita)

#### 2.2 — Garantir que o `initialSlug` e `cachedBrand` do useState inicial estejam consistentes

Verificar que no topo do `BrandProvider` o estado inicial está correto:

```typescript
const initialSlug = getCurrentBrand();
const cachedBrand = getCachedBrand(initialSlug);

const [brand, setBrand] = useState<Brand | null>(cachedBrand);
const [isLoading, setIsLoading] = useState(!cachedBrand); // true se não tem cache
```

Se o `isLoading` inicial já é `useState(false)`, corrigir:

```diff
- const [isLoading, setIsLoading] = useState(false);
+ const [isLoading, setIsLoading] = useState(!cachedBrand);
```

Isso garante que se não tem cache, o estado inicial já é loading, antes mesmo do `loadBrand` rodar.

### Passo 3 — Garantir que a HomePage respeita o loading da marca

No `src/app/App.tsx`, dentro do `HomePage`, já existe uma checagem de loading:

```typescript
const isLoading = brandLoading && !brand && !brandConfig;
```

Essa condição é muito permissiva — `brandConfig` sempre existe (vem do `BRAND_CONFIGS` local), então `isLoading` é sempre `false` mesmo quando a marca real não carregou.

Corrigir para:

```diff
- const isLoading = brandLoading && !brand && !brandConfig;
+ const isLoading = brandLoading;
```

Isso faz a HomePage mostrar o spinner de loading enquanto `BrandContext.isLoading` é `true`. Quando o fetch completar (sucesso ou falha), o loading vira `false` e a página renderiza.

**Verificar** se outros componentes/páginas fazem checagem similar de `brandLoading` e ajustar se necessário. Buscar:

```bash
grep -rn "brandLoading\|isLoading.*brand" src/ --include="*.tsx" --include="*.ts"
```

### Passo 4 — Adicionar retry no fetch da marca

Atualmente, se o fetch falha, fica no fallback local (sem dados). Adicionar um retry simples:

No `loadBrand`, dentro do `catch`:

```diff
    } catch {
      if (loadId !== loadIdRef.current) return;
      console.warn(`[BrandContext] DB update falhou para "${slug}", usando dados locais.`);

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
      setIsLoading(false);
+
+     // Retry após 3 segundos (uma tentativa)
+     setTimeout(() => {
+       if (loadIdRef.current === loadId) {
+         fetchBrandFromDB(slug)
+           .then((data) => {
+             setBrand(data);
+             setCurrentSlug(slug);
+             setError(null);
+             setCachedBrand(slug, data);
+           })
+           .catch(() => {
+             console.warn(`[BrandContext] Retry também falhou para "${slug}".`);
+           });
+       }
+     }, 3000);
    }
```

### Passo 5 — Verificar e testar

```bash
# Build
npm run build

# Verificar que não quebrou nada:
grep -rn "isLoading.*brand\|brandLoading" src/ --include="*.tsx" --include="*.ts"
```

**Testar manualmente estes cenários:**

1. **Limpar TUDO do navegador** (cookies, cache, sessionStorage, localStorage) → Abrir o site → Deve mostrar loading e depois carregar normalmente
2. **Aba anônima** → Abrir o site → Mesmo comportamento
3. **Refresh normal (F5)** → Deve funcionar instantaneamente (sessionStorage preservado)
4. **Desligar internet / bloquear Supabase** → Deve mostrar loading por uns segundos e depois mostrar pelo menos o layout da marca (tema, logo) mesmo sem dados de produtos

### Passo 6 — Commit

```bash
git add -A
git commit -m "fix: BrandContext - manter loading até brand carregar do banco quando não há cache"
```

---

## Resumo dos arquivos tocados

| Arquivo | O que muda |
|---|---|
| `src/contexts/BrandContext.tsx` | `isLoading` inicial baseado em cache. `loadBrand` mantém loading até fetch completar quando não há cache. Retry de 3s em caso de falha. |
| `src/app/App.tsx` | HomePage: simplificar condição de `isLoading` para `brandLoading`. |

---

## Por que isso resolve

| Cenário | Antes | Depois |
|---|---|---|
| Primeira visita (sem cache) | `brand.id = ''` → queries não rodam → tela branca | Loading → fetch completa → `brand.id` real → queries rodam |
| Cache limpo pelo usuário | Mesmo que acima | Mesmo que acima |
| Aba anônima | Tela branca | Loading → funciona |
| Refresh normal | Funciona (sessionStorage vivo) | Funciona igual |
| Supabase offline | Tela branca pra sempre | Loading → fallback local → retry após 3s |
