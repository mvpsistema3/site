# Plano de Refatoração Definitivo — grupogot-site

**Baseado no diagnóstico completo de 22/02/2026**

---

## Resumo do Diagnóstico

| Métrica | Valor | Severidade |
|---|---|---|
| App.tsx | 3835 linhas (20% do projeto) | 🔴 Crítico |
| React.memo | 0 usos | 🔴 Crítico |
| React.lazy | 0 usos | 🟡 Alto |
| CartContext wrapper sobre Zustand | Ativo em 4 consumers | 🔴 Crítico |
| AuthContext consumers sem seletor | 30+ componentes | 🔴 Crítico |
| `window.dispatchEvent` para login modal | 6 locais | 🟡 Alto |
| Campos computados persistidos no cart | 5 campos redundantes | 🟡 Médio |
| Debounce na busca | Inexistente | 🟡 Médio |

---

## Fase 1 — Eliminar Re-renders Cascata (Impacto imediato)

### 1.1 Eliminar CartContext — usar Zustand direto

**Por quê:** O `CartContext` no App.tsx (linha 68-80) envolve o Zustand store num React Context. Qualquer mudança no carrinho (adicionar item, abrir drawer, atualizar quantidade) cria nova referência do `cartContextValue` → re-renderiza Header (500+ linhas), ProductDetailPage, CartDrawer, CartPage, todos ao mesmo tempo.

**Arquivos a alterar:**

#### `src/app/App.tsx`

```diff
// REMOVER estas linhas (~68-80):
- interface CartContextType {
-   cart: StoreCartItem[];
-   addToCart: (product: Product, size: string, color: string) => void;
-   removeFromCart: (productId: string, size: string, color: string) => void;
-   updateQuantity: (productId: string, size: string, color: string, delta: number) => void;
-   clearCart: () => void;
-   cartCount: number;
-   isCartOpen: boolean;
-   setIsCartOpen: (isOpen: boolean) => void;
- }
- const CartContext = createContext<CartContextType>({} as CartContextType);
- const useCart = () => useContext(CartContext);

// REMOVER do componente App (~3741-3755):
- const {
-   cart, isCartOpen, setIsCartOpen,
-   addToCart: storeAddToCart, removeFromCart,
-   updateQuantity, clearCart, cartCount,
- } = useCartStore();
-
- const addToCart = useCallback(...);
- const cartContextValue = useMemo(...);

// REMOVER do JSX do App:
- <CartContext.Provider value={cartContextValue}>
-   ...
- </CartContext.Provider>
// Manter apenas o conteúdo que estava dentro do Provider
```

#### Substituir `useCart()` em cada componente:

**CartDrawer (App.tsx ~L560):**
```diff
- const { cart, removeFromCart, isCartOpen, setIsCartOpen, cartCount } = useCart();
+ const cart = useCartStore((s) => s.cart);
+ const removeFromCart = useCartStore((s) => s.removeFromCart);
+ const isCartOpen = useCartStore((s) => s.isCartOpen);
+ const setIsCartOpen = useCartStore((s) => s.setIsCartOpen);
+ const cartCount = useCartStore((s) => s.cartCount);
```

**Header (App.tsx ~L791):**
```diff
- const { cartCount, setIsCartOpen } = useCart();
+ const cartCount = useCartStore((s) => s.cartCount);
+ const setIsCartOpen = useCartStore((s) => s.setIsCartOpen);
```

**CartPage (App.tsx ~L1574):**
```diff
- const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
+ const cart = useCartStore((s) => s.cart);
+ const updateQuantity = useCartStore((s) => s.updateQuantity);
+ const removeFromCart = useCartStore((s) => s.removeFromCart);
+ const clearCart = useCartStore((s) => s.clearCart);
```

**ProductDetailPage (App.tsx ~L2949):**
```diff
- const { addToCart, setIsCartOpen } = useCart();
+ const storeAddToCart = useCartStore((s) => s.addToCart);
+ const setIsCartOpen = useCartStore((s) => s.setIsCartOpen);
```

E manter a lógica de conversão do `addToCart` localmente no ProductDetailPage:
```tsx
const handleAddToCart = () => {
  // ... validações existentes ...
  storeAddToCart({
    id: product.id,
    name: product.name,
    price: variantPrice,
    images: images,
    selectedSize: finalSize,
    selectedColor: finalColor,
    quantity: 1,
    variantId: matchedVariant?.id,
    stock: matchedVariant?.stock,
  });
  setIsCartOpen(true);
};
```

**Resultado:** Cada componente só re-renderiza quando o campo específico que ele usa muda. Header não re-renderiza mais ao adicionar item ao carrinho (só `cartCount` muda, não todo o objeto).

---

### 1.2 Adicionar `_hasHydrated` ao cartStore

**Por quê:** O CheckoutPage já tem um workaround manual (linhas 67-70), mas é frágil e não protege outros componentes (CartPage, FreeShippingProgress, Header com cartCount).

**Arquivo:** `src/stores/cartStore.ts`

```diff
interface CartState {
+ _hasHydrated: boolean;
  cart: CartItem[];
  // ... resto igual
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
+     _hasHydrated: false,
      cart: [],
      // ... resto igual
    }),
    {
      name: 'store-cart-storage',
      storage: createJSONStorage(() => cartStorage),
      partialize: (state) => ({
        cart: state.cart,
        coupon: state.coupon,
        shipping: state.shipping,
-       shippingCost: state.shippingCost,
-       cartSubtotal: state.cartSubtotal,
-       cartTotal: state.cartTotal,
-       discountAmount: state.discountAmount,
-       finalTotal: state.finalTotal,
-       cartCount: state.cartCount,
+       // Só persistir dados base — valores computados são recalculados na hidratação
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.cart.length > 0) {
          const subtotal = state.cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
          const discount = state.coupon?.discount || 0;
          const total = Math.max(0, subtotal - discount);
          const shippingCost = state.shipping ? parseFloat(state.shipping.ShippingPrice) : 0;

          useCartStore.setState({
+           _hasHydrated: true,
            cartSubtotal: subtotal,
            cartCount: state.cart.reduce((acc, i) => acc + i.quantity, 0),
            discountAmount: discount,
            cartTotal: total,
            shippingCost,
            finalTotal: total + shippingCost,
          });
+       } else {
+         useCartStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);
```

**Uso no CheckoutPage (simplifica o workaround existente):**
```diff
// src/pages/CheckoutPage.tsx — substituir linhas 67-70:
- const [cartHydrated, setCartHydrated] = useState(useCartStore.persist.hasHydrated());
- useEffect(() => {
-   const unsub = useCartStore.persist.onFinishHydration(() => setCartHydrated(true));
-   return unsub;
- }, []);
+ const cartHydrated = useCartStore((s) => s._hasHydrated);
```

**Uso no CartPage e qualquer componente que lê cart no mount:**
```tsx
const hasHydrated = useCartStore((s) => s._hasHydrated);
if (!hasHydrated) return <LoadingSpinner />;
```

**Também remover do `partialize`** os 5 campos computados (`shippingCost`, `cartSubtotal`, `cartTotal`, `discountAmount`, `finalTotal`, `cartCount`). Esses são derivados de `cart` e `coupon` — persistí-los causa inconsistência quando o localStorage está stale. O `onRehydrateStorage` já recalcula tudo.

---

### 1.3 Criar LoginModal Store (eliminar window.dispatchEvent)

**Por quê:** 6 locais no projeto usam `window.dispatchEvent(new CustomEvent('open-login-modal'))` para comunicar com o Header. Isso é um code smell que indica que o LoginModal está no lugar errado.

**Criar arquivo:** `src/stores/uiStore.ts`

```typescript
import { create } from 'zustand';

interface UIState {
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLoginModalOpen: false,
  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
}));
```

**Substituir em todos os 6 locais:**
```diff
// Em ProductCard, ProtectedRoute, CustomerInfoForm, ProductDetailPage:
- window.dispatchEvent(new CustomEvent('open-login-modal'));
+ useUIStore.getState().openLoginModal();
// Nota: useUIStore.getState() funciona fora de componentes e em callbacks

// No Header (App.tsx ~L800):
- const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
- useEffect(() => {
-   const handler = () => setIsLoginModalOpen(true);
-   window.addEventListener('open-login-modal', handler);
-   return () => window.removeEventListener('open-login-modal', handler);
- }, []);
+ const isLoginModalOpen = useUIStore((s) => s.isLoginModalOpen);
+ const closeLoginModal = useUIStore((s) => s.closeLoginModal);

// Mover LoginModal para FORA do Header, para o nível App:
// No App component JSX:
+ <LoginModal
+   isOpen={useUIStore((s) => s.isLoginModalOpen)}
+   onClose={() => useUIStore.getState().closeLoginModal()}
+ />
```

**Resultado:** Remove 1 useState + 1 useEffect do Header (menos re-renders), elimina event listeners globais, LoginModal vive no nível correto da árvore.

---

### 1.4 Remover console.log de debug em produção

**Arquivo:** `src/app/App.tsx` — ProductDetailPage (~L3020)

```diff
- useEffect(() => {
-   if (product) {
-     console.log('=== DEBUG VARIANTES ===');
-     console.log('Produto:', product.name);
-     console.log('product_variants raw:', product.product_variants);
-     console.log('Variantes filtradas (active):', variants);
-     console.log('Número de variantes:', variants.length);
-     console.log('Cores únicas:', colors);
-     console.log('Tamanhos únicos:', sizes);
-     variants.forEach((v: any, i: number) => {
-       console.log(`Variante ${i}:`, { id: v.id, color: v.color, size: v.size, stock: v.stock, active: v.active });
-     });
-   }
- }, [product, variants.length, colors.length, sizes.length]);
```

---

## Fase 2 — Memoização e Componentização

### 2.1 React.memo no ProductCard

**Por quê:** O `ProductCard` é renderizado N vezes em listas (HomePage, ShopPage, FavoritesPage). Ele consome `useAuth()` (para filtro de tabaco) e `useBrandColors()`. Qualquer mudança no AuthContext ou BrandContext re-renderiza TODOS os cards simultaneamente.

**Arquivo:** `src/components/ProductCard.tsx`

```diff
+ import React from 'react';

- const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
+ const ProductCard: React.FC<ProductCardProps> = React.memo(({ product }) => {
    // ... corpo igual
- };
+ }, (prevProps, nextProps) => {
+   // Comparação shallow do produto — re-renderiza apenas se o produto mudou
+   return prevProps.product.id === nextProps.product.id
+     && prevProps.product.price === nextProps.product.price
+     && prevProps.product.name === nextProps.product.name;
+ });
```

**Problema adicional:** ProductCard usa `useAuth()` internamente só para checar `user` (filtro de tabaco). Esse filtro deveria ser feito no **parent** (lista), não no card. Mover a lógica:

```diff
// No ProductCard — REMOVER:
- const { user } = useAuth();

// No parent (HomePage, ShopPage) — MANTER o filtro que já existe:
const visibleProducts = useMemo(() => {
  return products.filter((p) => !p.is_tabaco || user);
}, [products, user]);
// ↑ Isso já existe! O ProductCard não precisa do useAuth.
```

**Resultado:** ProductCard fica puro (só recebe props), React.memo funciona efetivamente. Lista de 20 produtos não re-renderiza todos os cards quando o auth muda.

---

### 2.2 Extrair Header em sub-componentes

**Por quê:** O Header atual (~500 linhas no App.tsx) renderiza inline: SearchBar, CategoryNav, MobileMenu, MobileSearch, CartDrawer, LoginModal. Qualquer estado interno (isScrolled, isMobileMenuOpen, searchQuery) re-renderiza TUDO.

**Arquivos a criar:**

```
src/components/layout/Header.tsx          — Container principal (slim)
src/components/layout/DesktopNav.tsx      — Navegação de categorias
src/components/layout/MobileMenu.tsx      — Drawer lateral mobile
src/components/layout/MobileSearch.tsx    — Overlay de busca mobile
src/components/layout/HeaderActions.tsx   — Ícones (search, user, cart, favorites)
```

**Princípios:**
- Cada sub-componente recebe props mínimas ou usa stores direto
- `React.memo` em cada sub-componente
- CartDrawer sai do Header → vai para o nível App
- LoginModal sai do Header → já movido na Fase 1.3

**Exemplo — HeaderActions (ícones da direita):**
```tsx
// src/components/layout/HeaderActions.tsx
import React from 'react';
import { Search, Heart, ShoppingBag, User } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useUIStore } from '../../stores/uiStore';
import { useFavoritesCount } from '../../hooks/useFavorites';
import { useAuth } from '../../contexts/AuthContext';
import { useBrandColors } from '../../hooks/useTheme';
import { UserMenu } from '../UserMenu';

interface HeaderActionsProps {
  onSearchClick: () => void;
  onNavigate: (path: string) => void;
}

export const HeaderActions = React.memo<HeaderActionsProps>(({
  onSearchClick,
  onNavigate,
}) => {
  // Seletores granulares — só re-renderiza se o valor específico mudar
  const cartCount = useCartStore((s) => s.cartCount);
  const setIsCartOpen = useCartStore((s) => s.setIsCartOpen);
  const openLoginModal = useUIStore((s) => s.openLoginModal);
  const { user } = useAuth();
  const favoritesCount = useFavoritesCount();
  const { primaryColor } = useBrandColors();

  return (
    <div className="flex items-center gap-1">
      {/* Mobile search */}
      <button className="lg:hidden ..." onClick={onSearchClick}>
        <Search size={18} />
      </button>

      {/* Favorites */}
      <button className="hidden lg:flex ..." onClick={() => onNavigate('/favorites')}>
        <Heart size={18} />
        {favoritesCount > 0 && <span style={{ backgroundColor: primaryColor }}>{favoritesCount}</span>}
      </button>

      {/* User */}
      {user ? <UserMenu /> : (
        <button onClick={openLoginModal}><User size={18} /></button>
      )}

      {/* Cart */}
      <button onClick={() => setIsCartOpen(true)}>
        <ShoppingBag size={18} />
        {cartCount > 0 && <span style={{ backgroundColor: primaryColor }}>{cartCount}</span>}
      </button>
    </div>
  );
});
```

**Resultado:** Quando `isScrolled` muda (a cada scroll), só o container slim re-renderiza, não os ícones, menus, busca.

---

### 2.3 Debounce no SearchContext

**Por quê:** `setSearchQuery` dispara a cada keystroke. O Header consome `useSearch()`, então re-renderiza ~5x/segundo durante digitação. O `useFuzzySearch` recria o Fuse.js search a cada mudança de query.

**Arquivo:** `src/contexts/SearchContext.tsx`

```diff
- import React, { createContext, useContext, useState, ReactNode } from 'react';
+ import React, { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';

  export function SearchProvider({ children }: { children: ReactNode }) {
-   const [searchQuery, setSearchQuery] = useState('');
+   const [searchQuery, setSearchQuery] = useState('');
+   const [debouncedQuery, setDebouncedQuery] = useState('');
+   const timerRef = useRef<ReturnType<typeof setTimeout>>();
+
+   const updateSearch = useCallback((query: string) => {
+     setSearchQuery(query); // Atualiza input imediatamente (UX responsivo)
+     clearTimeout(timerRef.current);
+     timerRef.current = setTimeout(() => {
+       setDebouncedQuery(query); // Atualiza busca real com debounce
+     }, 300);
+   }, []);

-   const clearSearch = () => setSearchQuery('');
+   const clearSearch = useCallback(() => {
+     setSearchQuery('');
+     setDebouncedQuery('');
+     clearTimeout(timerRef.current);
+   }, []);

    return (
      <SearchContext.Provider value={{
-       searchQuery, setSearchQuery, clearSearch
+       searchQuery,          // Para o input (sem debounce)
+       debouncedQuery,       // Para busca real (com debounce)
+       setSearchQuery: updateSearch,
+       clearSearch,
      }}>
        {children}
      </SearchContext.Provider>
    );
  }
```

**Nos consumers:** Usar `debouncedQuery` para busca, `searchQuery` para o valor do input.

```diff
// useFuzzySearch.ts — usar debouncedQuery:
- export function useFuzzySearch(searchQuery: string) {
+ export function useFuzzySearch(query: string) {
  // query vem do debouncedQuery, não do searchQuery

// ProductListPage — usar debouncedQuery para busca:
- const { searchQuery, clearSearch } = useSearch();
+ const { searchQuery, debouncedQuery, clearSearch } = useSearch();
- const { products: searchResults } = useFuzzySearch(searchQuery);
+ const { products: searchResults } = useFuzzySearch(debouncedQuery);
```

---

## Fase 3 — Separação de Arquivos e Code Splitting

### 3.1 Extrair componentes do App.tsx

O App.tsx tem 3835 linhas. Extrair para arquivos separados:

| Componente | Destino | Linhas aprox. |
|---|---|---|
| ScrollToTop | `src/components/ScrollToTop.tsx` | 50 |
| ScrollReveal, ParallaxImage, StaggerContainer, StaggerItem | `src/components/animations/` | 120 |
| Button | `src/components/Button.tsx` | 60 |
| ProductCard | Já existe em `src/components/ProductCard.tsx` — remover duplicata do App.tsx | — |
| FAQSection | `src/components/FAQSection.tsx` | 80 |
| CartDrawer | `src/components/CartDrawer.tsx` | 150 |
| Header → sub-componentes | `src/components/layout/` | 500 |
| Footer | `src/components/layout/Footer.tsx` | 200 |
| CartPage | `src/pages/CartPage.tsx` | 250 |
| HomePage | `src/pages/HomePage.tsx` | 350 |
| ProductListPage | `src/pages/ProductListPage.tsx` (ou ShopPage) | 450 |
| ProductDetailPage | `src/pages/ProductDetailPage.tsx` | 550 |

**App.tsx final deveria ter ~100-150 linhas:** apenas providers, router, e layout shell.

### 3.2 React.lazy para rotas pesadas

```tsx
// src/app/App.tsx — após extração:
const HomePage = React.lazy(() => import('../pages/HomePage'));
const ProductListPage = React.lazy(() => import('../pages/ProductListPage'));
const ProductDetailPage = React.lazy(() => import('../pages/ProductDetailPage'));
const CartPage = React.lazy(() => import('../pages/CartPage'));
const CheckoutPage = React.lazy(() => import('../pages/CheckoutPage'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
const OrdersPage = React.lazy(() => import('../pages/OrdersPage'));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));
const FavoritesPage = React.lazy(() => import('../pages/FavoritesPage'));
const FAQPage = React.lazy(() => import('../pages/FAQPage'));

// Wrap routes:
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/" element={<HomePage />} />
    {/* ... */}
  </Routes>
</Suspense>
```

**Resultado:** Bundle inicial carrega só Home + Header + Footer. Checkout, Profile, FAQ são carregados sob demanda.

---

## Fase 4 — Otimizações Adicionais

### 4.1 Limpar `partialize` do cartStore

O `partialize` persiste 5 campos computados que são derivados de `cart` + `coupon`. Remover:

```diff
partialize: (state) => ({
  cart: state.cart,
  coupon: state.coupon,
  shipping: state.shipping,
- shippingCost: state.shippingCost,
- cartSubtotal: state.cartSubtotal,
- cartTotal: state.cartTotal,
- discountAmount: state.discountAmount,
- finalTotal: state.finalTotal,
- cartCount: state.cartCount,
}),
```

O `onRehydrateStorage` já recalcula tudo a partir de `cart` e `coupon`.

### 4.2 AuthContext — extrair `user` para store separado (futuro)

O `AuthContext` é o segundo maior causador de re-renders (30+ consumers). A maioria dos consumers só precisa de `user` (não de `signIn`, `signUp`, `profile`, etc.).

**Opção A (simples):** Criar `useIsAuthenticated()` hook que usa seletor:
```tsx
// Não resolve o problema do Context, mas minimiza o impacto
export const useIsAuthenticated = () => {
  const { user } = useAuth();
  return !!user;
};
```

**Opção B (ideal, mas mais trabalho):** Migrar auth para Zustand com seletores. Isso é Fase 4 — só faz sentido depois das fases 1-3.

### 4.3 signOut limpa localStorage do cart — intencional?

```typescript
// AuthContext.tsx — signOut():
localStorage.removeItem('store-cart-storage');
```

Isso **limpa o carrinho ao fazer logout**. Se o usuário tinha itens no carrinho, eles somem. Verificar se é intencional ou se deveria manter o carrinho (carrinho é anônimo em muitos e-commerces).

---

## Ordem de Execução e Estimativa

| Fase | Tarefa | Tempo | Impacto |
|---|---|---|---|
| 1.1 | Eliminar CartContext | 2h | 🔴🔴🔴 Resolve ~60% dos re-renders |
| 1.2 | `_hasHydrated` + limpar partialize | 30min | 🔴🔴 Resolve bug de refresh |
| 1.3 | LoginModal store (uiStore) | 1h | 🟡 Remove event listeners + 1 useState do Header |
| 1.4 | Remover console.log | 5min | 🟢 Quick win |
| 2.1 | React.memo no ProductCard + remover useAuth dele | 30min | 🔴🔴 Cards não re-renderizam em cascata |
| 2.2 | Extrair Header em sub-componentes | 3h | 🔴🔴 Isola re-renders do Header |
| 2.3 | Debounce no SearchContext | 30min | 🟡 Reduz re-renders durante digitação |
| 3.1 | Extrair componentes do App.tsx | 4h | 🟡 Manutenibilidade + habilita code splitting |
| 3.2 | React.lazy para rotas | 1h | 🟡 Reduz bundle inicial |
| 4.1 | Limpar partialize | 15min | 🟢 Previne dados stale |
| 4.2 | AuthContext otimização | 4h+ | 🟡 Futuro |
| | **Total Fase 1-2** | **~8h** | **Resolve 90%+ dos problemas** |

---

## Como Validar Cada Fase

### React DevTools Profiler
1. Abrir React DevTools → Profiler
2. Ativar "Highlight updates when components render"
3. Testar cenários:

| Cenário | Antes | Depois (esperado) |
|---|---|---|
| Clicar "Adicionar ao Carrinho" | Tela INTEIRA pisca | Só CartDrawer + badge do Header |
| Abrir/fechar CartDrawer | Header + página piscam | Só CartDrawer |
| Digitar na busca | Header inteiro pisca a cada tecla | Só input pisca; resultados após 300ms |
| F5 no /checkout | Carrinho vazio → redirect | Loading → carrinho correto |
| Login/Logout | Todos os ProductCards piscam | Nenhum ProductCard pisca |

### Performance tab
1. Chrome DevTools → Performance → Record
2. Adicionar item ao carrinho
3. Verificar se há "Long Tasks" (>50ms) durante a interação
4. Antes: esperar 200-500ms de bloqueio
5. Depois: <50ms

---

*Plano gerado em 22/02/2026 — Grupo GOT*
