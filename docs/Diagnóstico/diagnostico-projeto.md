# Relatório de Diagnóstico do Projeto — grupogot-site

**Data:** 2026-02-22
**Objetivo:** Análise completa da arquitetura para refatoração de performance

---

## 1. Estrutura de Pastas (tree)

```
src/app/App.tsx
src/app/main.tsx
src/components/AccountLayout.tsx
src/components/AgeVerificationPopup.tsx
src/components/BrandLink.tsx
src/components/CEPInput.tsx
src/components/checkout/AddressForm.tsx
src/components/checkout/CheckoutStepper.tsx
src/components/checkout/CheckoutSummary.tsx
src/components/checkout/CreditCardForm.tsx
src/components/checkout/CustomerInfoForm.tsx
src/components/checkout/InstallmentSelector.tsx
src/components/checkout/OrderReview.tsx
src/components/checkout/PaymentMethodSelector.tsx
src/components/checkout/PaymentModal.tsx
src/components/checkout/PixPaymentView.tsx
src/components/checkout/ShippingMethodSelector.tsx
src/components/CheckoutStockAlert.tsx
src/components/CouponInput.tsx
src/components/ErrorBoundary.tsx
src/components/FeatureFlag.tsx
src/components/FreeShippingBanner.tsx
src/components/FreeShippingProgress.tsx
src/components/ImageLightbox.tsx
src/components/LoginModal.tsx
src/components/MarqueeBanner.tsx
src/components/MinOrderValueWarning.tsx
src/components/OrderReservationTimer.tsx
src/components/PriceDisplay.tsx
src/components/ProductAccordion.tsx
src/components/ProductCard.tsx
src/components/ProductDetailSkeleton.tsx
src/components/ProductSectionWithTabs.tsx
src/components/PromoPopup.tsx
src/components/ProtectedRoute.tsx
src/components/SearchPreview.tsx
src/components/SEOHead.tsx
src/components/ShippingCalculator.tsx
src/components/ShippingOption.tsx
src/components/ShopPageSkeleton.tsx
src/components/StickyMobileCTA.tsx
src/components/StockWarning.tsx
src/components/ToastNotification.tsx
src/components/TrustBadges.tsx
src/components/UserMenu.tsx
src/components/VariantSelector.tsx
src/config/brands.ts
src/contexts/AuthContext.tsx
src/contexts/BrandContext.tsx
src/contexts/SearchContext.tsx
src/hooks/useAddresses.ts
src/hooks/useAsaasPayment.ts
src/hooks/useBanners.ts
src/hooks/useCategories.ts
src/hooks/useCheckout.ts
src/hooks/useCollections.ts
src/hooks/useCoupons.ts
src/hooks/useCustomerProfile.ts
src/hooks/useFAQs.ts
src/hooks/useFavorites.ts
src/hooks/useFeatureFlag.ts
src/hooks/useFooterLinks.ts
src/hooks/useFuzzySearch.ts
src/hooks/useOrders.ts
src/hooks/usePixPolling.ts
src/hooks/useProducts.ts
src/hooks/useShipping.ts
src/hooks/useStaticPages.ts
src/hooks/useTheme.ts
src/hooks/useViaCep.ts
src/lib/asaas.ts
src/lib/brand-detection.ts
src/lib/cpf.ts
src/lib/credit-card.ts
src/lib/currency.utils.ts
src/lib/frenet.service.ts
src/lib/queryClient.ts
src/lib/supabase.ts
src/lib/utils.ts
src/lib/viaCep.ts
src/pages/CheckoutExample.tsx
src/pages/CheckoutPage.tsx
src/pages/FAQPage.tsx
src/pages/FavoritesPage.tsx
src/pages/OrderConfirmationPage.tsx
src/pages/OrdersPage.tsx
src/pages/ProductPage.example.tsx
src/pages/ProfilePage.tsx
src/pages/SettingsPage.tsx
src/pages/StaticPageRenderer.tsx
src/stores/cartStore.ts
src/stores/toastStore.ts
src/types/checkout.types.ts
src/types/coupon.ts
src/types/index.ts
src/types/shipping.types.ts
```

---

## 2. Conteúdo Completo dos Arquivos

### `src/stores/cartStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FrenetShippingService } from '../types/shipping.types';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  images: string[];
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  variantId?: string; // ID da variante para validação de estoque
  stock?: number; // Estoque disponível
}

interface CartState {
  cart: CartItem[];
  isCartOpen: boolean;
  coupon: { code: string; discount: number } | null;
  shipping: FrenetShippingService | null;
  shippingCost: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, size: string, color: string) => void;
  updateQuantity: (id: string, size: string, color: string, delta: number) => void;
  clearCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  setShipping: (shipping: FrenetShippingService | null) => void;
  removeShipping: () => void;
  cartCount: number;
  cartTotal: number;
  cartSubtotal: number;
  discountAmount: number;
  finalTotal: number;
  getItemStock: (id: string, size: string, color: string) => number | undefined;
  isMinOrderValueMet: (minValue: number) => boolean;
  getFreeShippingProgress: (threshold: number) => { remaining: number; percentage: number; isEligible: boolean };
}

// Storage com TTL de 6 horas - carrinho expira automaticamente
const CART_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

const cartStorage = {
  getItem: (name: string) => {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;

      const data = JSON.parse(raw);

      // Verifica se expirou
      if (data._timestamp && Date.now() - data._timestamp > CART_TTL_MS) {
        localStorage.removeItem(name);
        return null;
      }

      return raw;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      const data = JSON.parse(value);
      data._timestamp = Date.now();
      localStorage.setItem(name, JSON.stringify(data));
    } catch {
      localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      isCartOpen: false,
      coupon: null,
      shipping: null,
      shippingCost: 0,
      cartCount: 0,
      cartTotal: 0,
      cartSubtotal: 0,
      discountAmount: 0,
      finalTotal: 0,

      addToCart: (item) => {
        set((state) => {
          const existing = state.cart.find(
            (i) => i.id === item.id && i.selectedSize === item.selectedSize && i.selectedColor === item.selectedColor
          );

          // Validação de estoque
          if (item.stock !== undefined) {
            const currentQty = existing?.quantity || 0;
            const totalQty = currentQty + item.quantity;

            if (totalQty > item.stock) {
              console.warn(`Estoque insuficiente. Disponível: ${item.stock}, Solicitado: ${totalQty}`);
              // Não adiciona se exceder o estoque
              return state;
            }
          }

          let newCart;
          if (existing) {
            newCart = state.cart.map((i) =>
              i.id === item.id && i.selectedSize === item.selectedSize && i.selectedColor === item.selectedColor
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            );
          } else {
            newCart = [...state.cart, item];
          }

          const subtotal = newCart.reduce((acc, i) => acc + i.price * i.quantity, 0);
          const discount = state.coupon?.discount || 0;
          const total = Math.max(0, subtotal - discount);
          const shippingCost = state.shipping ? parseFloat(state.shipping.ShippingPrice) : 0;

          return {
            cart: newCart,
            cartCount: newCart.reduce((acc, i) => acc + i.quantity, 0),
            cartSubtotal: subtotal,
            discountAmount: discount,
            cartTotal: total,
            finalTotal: total + shippingCost,
          };
        });
      },

      removeFromCart: (id, size, color) => {
        set((state) => {
          const newCart = state.cart.filter(
            (item) => !(item.id === id && item.selectedSize === size && item.selectedColor === color)
          );
          const subtotal = newCart.reduce((acc, i) => acc + i.price * i.quantity, 0);
          const discount = state.coupon?.discount || 0;
          const total = Math.max(0, subtotal - discount);
          const shippingCost = state.shipping ? parseFloat(state.shipping.ShippingPrice) : 0;

          return {
            cart: newCart,
            cartCount: newCart.reduce((acc, i) => acc + i.quantity, 0),
            cartSubtotal: subtotal,
            discountAmount: discount,
            cartTotal: total,
            finalTotal: total + shippingCost,
          };
        });
      },

      updateQuantity: (id, size, color, delta) => {
        set((state) => {
          const newCart = state.cart.map((item) => {
            if (item.id === id && item.selectedSize === size && item.selectedColor === color) {
              const newQty = Math.max(1, item.quantity + delta);

              // Validação de estoque
              if (item.stock !== undefined && newQty > item.stock) {
                console.warn(`Estoque insuficiente. Disponível: ${item.stock}`);
                return item; // Não atualiza se exceder estoque
              }

              return { ...item, quantity: newQty };
            }
            return item;
          });
          const subtotal = newCart.reduce((acc, i) => acc + i.price * i.quantity, 0);
          const discount = state.coupon?.discount || 0;
          const total = Math.max(0, subtotal - discount);
          const shippingCost = state.shipping ? parseFloat(state.shipping.ShippingPrice) : 0;

          return {
            cart: newCart,
            cartCount: newCart.reduce((acc, i) => acc + i.quantity, 0),
            cartSubtotal: subtotal,
            discountAmount: discount,
            cartTotal: total,
            finalTotal: total + shippingCost,
          };
        });
      },

      clearCart: () => {
        set({
          cart: [],
          cartCount: 0,
          cartTotal: 0,
          cartSubtotal: 0,
          discountAmount: 0,
          shippingCost: 0,
          finalTotal: 0,
          coupon: null,
          shipping: null,
        });
      },

      setIsCartOpen: (isOpen) => {
        set({ isCartOpen: isOpen });
      },

      applyCoupon: (code, discount) => {
        set((state) => {
          const subtotal = state.cartSubtotal || state.cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
          const total = Math.max(0, subtotal - discount);
          const shippingCost = state.shipping ? parseFloat(state.shipping.ShippingPrice) : 0;

          return {
            coupon: { code, discount },
            discountAmount: discount,
            cartTotal: total,
            finalTotal: total + shippingCost,
          };
        });
      },

      removeCoupon: () => {
        set((state) => {
          const subtotal = state.cartSubtotal || state.cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
          const shippingCost = state.shipping ? parseFloat(state.shipping.ShippingPrice) : 0;

          return {
            coupon: null,
            discountAmount: 0,
            cartTotal: subtotal,
            finalTotal: subtotal + shippingCost,
          };
        });
      },

      setShipping: (shipping) => {
        set((state) => {
          const shippingCost = shipping ? parseFloat(shipping.ShippingPrice) : 0;
          const total = state.cartTotal || 0;

          return {
            shipping,
            shippingCost,
            finalTotal: total + shippingCost,
          };
        });
      },

      removeShipping: () => {
        set((state) => ({
          shipping: null,
          shippingCost: 0,
          finalTotal: state.cartTotal || 0,
        }));
      },

      getItemStock: (id, size, color) => {
        const item = get().cart.find(
          (i) => i.id === id && i.selectedSize === size && i.selectedColor === color
        );
        return item?.stock;
      },

      isMinOrderValueMet: (minValue) => {
        const total = get().cartTotal;
        return total >= minValue;
      },

      getFreeShippingProgress: (threshold) => {
        const state = get();
        // Recalcula subtotal se estiver zerado (caso de persistência)
        const subtotal = state.cartSubtotal || state.cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const remaining = Math.max(0, threshold - subtotal);
        const percentage = Math.min(100, (subtotal / threshold) * 100);
        const isEligible = subtotal >= threshold;

        return {
          remaining,
          percentage,
          isEligible,
        };
      },
    }),
    {
      name: 'store-cart-storage',
      storage: createJSONStorage(() => cartStorage),
      partialize: (state) => ({
        cart: state.cart,
        coupon: state.coupon,
        shipping: state.shipping,
        shippingCost: state.shippingCost,
        cartSubtotal: state.cartSubtotal,
        cartTotal: state.cartTotal,
        discountAmount: state.discountAmount,
        finalTotal: state.finalTotal,
        cartCount: state.cartCount,
      }),
      onRehydrateStorage: () => (state) => {
        // Safety net: recalculate computed values from cart items
        // in case persisted values are stale or missing
        if (state && state.cart.length > 0) {
          const subtotal = state.cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
          const discount = state.coupon?.discount || 0;
          const total = Math.max(0, subtotal - discount);
          const shippingCost = state.shipping ? parseFloat(state.shipping.ShippingPrice) : 0;

          useCartStore.setState({
            cartSubtotal: subtotal,
            cartCount: state.cart.reduce((acc, i) => acc + i.quantity, 0),
            discountAmount: discount,
            cartTotal: total,
            shippingCost,
            finalTotal: total + shippingCost,
          });
        }
      },
    }
  )
);
```

### `src/stores/toastStore.ts`

```typescript
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const PENDING_TOAST_KEY = 'pending_toast';

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  /** Salva um toast no localStorage para exibir após reload */
  queueToast: (message: string, type?: ToastType) => void;
  /** Verifica e exibe toasts pendentes do localStorage */
  flushPendingToasts: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  queueToast: (message, type = 'info') => {
    localStorage.setItem(PENDING_TOAST_KEY, JSON.stringify({ message, type }));
  },
  flushPendingToasts: () => {
    const raw = localStorage.getItem(PENDING_TOAST_KEY);
    if (raw) {
      localStorage.removeItem(PENDING_TOAST_KEY);
      try {
        const { message, type } = JSON.parse(raw);
        get().addToast(message, type);
      } catch {
        // ignore
      }
    }
  },
}));
```

### `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { BRAND_CONFIGS } from '../config/brands';
import { getCurrentBrand } from '../lib/brand-detection';

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  cpf: string | null;
}

interface CustomerBrand {
  brand_slug: string;
  created_at: string;
}

interface SignUpResult {
  error: AuthError | null;
  linked?: {
    existingBrands: string[]; // nomes das marcas onde já tinha conta
    newBrand: string;         // nome da marca sendo vinculada agora
    alreadyLinked: boolean;   // true se já estava vinculado a esta marca
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userBrands: CustomerBrand[];
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string, brandSlug?: string) => Promise<SignUpResult>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userBrands, setUserBrands] = useState<CustomerBrand[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('id, email, display_name, phone, cpf')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      return data as UserProfile | null;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }, []);

  const fetchCustomerBrands = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_brands')
        .select('brand_slug, created_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar marcas do cliente:', error);
        return [];
      }

      return (data || []) as CustomerBrand[];
    } catch (error) {
      console.error('Erro ao buscar marcas do cliente:', error);
      return [];
    }
  }, []);

  const updateUserState = useCallback(async (session: Session | null) => {
    try {
      if (session?.user) {
        setUser(session.user);
        setSession(session);

        const [userProfile, fetchedBrands] = await Promise.all([
          fetchProfile(session.user.id),
          fetchCustomerBrands(session.user.id),
        ]);
        let brands = fetchedBrands;

        if (!userProfile) {
          const displayName = session.user.user_metadata?.display_name || null;
          const { data: newProfile, error: profileError } = await supabase
            .from('customer_profiles')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              display_name: displayName,
            }, { onConflict: 'id' })
            .select('id, email, display_name, phone, cpf')
            .maybeSingle();

          if (profileError) {
            console.error('Erro ao auto-criar perfil:', profileError);
          }

          setProfile(newProfile as UserProfile | null);
        } else {
          setProfile(userProfile);
        }

        const currentBrandSlug = getCurrentBrand();
        if (currentBrandSlug && !brands.some(b => b.brand_slug === currentBrandSlug)) {
          const { error: linkError } = await supabase
            .from('customer_brands')
            .upsert({
              user_id: session.user.id,
              brand_slug: currentBrandSlug,
            }, { onConflict: 'user_id,brand_slug' });

          if (!linkError) {
            brands = [...brands, { brand_slug: currentBrandSlug, created_at: new Date().toISOString() }];
          }
        }
        setUserBrands(brands);
      } else {
        setUser(null);
        setProfile(null);
        setUserBrands([]);
        setSession(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar estado do usuário:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchCustomerBrands]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession) {
          const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();
          if (userError || !validatedUser) {
            await supabase.auth.signOut({ scope: 'local' });
            await updateUserState(null);
            return;
          }
        }

        await updateUserState(currentSession);
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await updateUserState(session);
      } catch (error) {
        console.error('Erro no listener de autenticação:', error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateUserState]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string, brandSlug?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error && error.message.includes('already registered')) {
        const targetSlug = brandSlug || 'sesh';
        const newBrandName = BRAND_CONFIGS[targetSlug]?.name || targetSlug;

        const { data: existingUser } = await supabase
          .from('customer_profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingUser) {
          const { data: existingBrandsData } = await supabase
            .from('customer_brands')
            .select('brand_slug')
            .eq('user_id', existingUser.id);

          const existingBrandSlugs = (existingBrandsData || []).map(b => b.brand_slug);
          const existingBrandNames = existingBrandSlugs.map(
            slug => BRAND_CONFIGS[slug]?.name || slug
          );

          if (existingBrandSlugs.includes(targetSlug)) {
            return {
              error: {
                message: 'Você já possui cadastro! Use "Entrar" para acessar com sua senha.'
              } as AuthError,
              linked: {
                existingBrands: existingBrandNames,
                newBrand: newBrandName,
                alreadyLinked: true,
              },
            };
          }

          const { error: brandError } = await supabase
            .from('customer_brands')
            .insert({
              user_id: existingUser.id,
              brand_slug: targetSlug,
            });

          if (brandError && !brandError.message.includes('duplicate')) {
            console.error('Erro ao associar marca:', brandError);
            return {
              error: {
                message: 'Erro ao associar à marca. Entre com sua senha para acessar.'
              } as AuthError,
            };
          }

          return {
            error: null,
            linked: {
              existingBrands: existingBrandNames,
              newBrand: newBrandName,
              alreadyLinked: false,
            },
          };
        }

        return {
          error: {
            message: `Você já possui cadastro! Use "Entrar" para acessar. Ao entrar, sua conta será vinculada à ${newBrandName} automaticamente.`
          } as AuthError,
          linked: {
            existingBrands: [],
            newBrand: newBrandName,
            alreadyLinked: true,
          },
        };
      }

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: displayName,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }

        const { error: brandError } = await supabase
          .from('customer_brands')
          .upsert({
            user_id: data.user.id,
            brand_slug: brandSlug || 'sesh',
          }, { onConflict: 'user_id,brand_slug' });

        if (brandError) {
          console.error('Erro ao associar marca:', brandError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setUserBrands([]);
    setSession(null);
    queryClient.clear();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      try {
        const projectRef = import.meta.env.VITE_SUPABASE_URL
          ?.replace('https://', '')
          ?.split('.')[0];
        if (projectRef) {
          localStorage.removeItem(`sb-${projectRef}-auth-token`);
        }

        localStorage.removeItem('store-cart-storage');
      } catch {
        // ignore storage errors
      }
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const [userProfile, brands] = await Promise.all([
        fetchProfile(user.id),
        fetchCustomerBrands(user.id),
      ]);
      setProfile(userProfile);
      setUserBrands(brands);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userBrands,
        session,
        loading,
        signIn,
        signUp,
        signInWithMagicLink,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
```

### `src/contexts/BrandContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { getCurrentBrand } from '../lib/brand-detection';
import { getBrandConfig, BrandConfig } from '../config/brands';

interface Brand {
  id: string;
  slug: string;
  name: string;
  domain: string;
  theme: any;
  features: any;
  settings: any;
  active: boolean;
}

interface BrandContextType {
  brand: Brand | null;
  brandConfig: BrandConfig;
  isLoading: boolean;
  error: Error | null;
  currentSlug: string;
  refreshBrand: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const BRAND_CACHE_KEY = 'brand_cache_';
const QUERY_TIMEOUT = 8000;

const getCachedBrand = (slug: string): Brand | null => {
  try {
    const cached = sessionStorage.getItem(BRAND_CACHE_KEY + slug);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
};

const setCachedBrand = (slug: string, brand: Brand) => {
  try {
    sessionStorage.setItem(BRAND_CACHE_KEY + slug, JSON.stringify(brand));
  } catch { /* ignore */ }
};

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSlug = getCurrentBrand();
  const cachedBrand = getCachedBrand(initialSlug);

  const [brand, setBrand] = useState<Brand | null>(cachedBrand);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const loadIdRef = useRef(0);

  const fetchBrandFromDB = useCallback(async (slug: string): Promise<Brand> => {
    const url = `${supabaseUrl}/rest/v1/brands?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=*`;
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Accept': 'application/vnd.pgrst.object+json',
      },
      signal: AbortSignal.timeout(QUERY_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json() as Brand;
  }, []);

  const loadBrand = useCallback(async (slug: string) => {
    const loadId = ++loadIdRef.current;

    const cached = getCachedBrand(slug);
    if (cached) {
      setBrand(cached);
    } else {
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
    }
    setCurrentSlug(slug);
    setIsLoading(false);

    try {
      const data = await fetchBrandFromDB(slug);
      if (loadId !== loadIdRef.current) return;

      setBrand(data);
      setCurrentSlug(slug);
      setError(null);
      setCachedBrand(slug, data);
    } catch {
      if (loadId !== loadIdRef.current) return;
      console.warn(`[BrandContext] DB update falhou para "${slug}", usando dados locais.`);
    }
  }, [fetchBrandFromDB]);

  useEffect(() => {
    loadBrand(getCurrentBrand());
  }, [loadBrand]);

  useEffect(() => {
    const handleHashChange = () => {
      const newSlug = getCurrentBrand();
      if (newSlug !== currentSlug) {
        loadBrand(newSlug);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentSlug, loadBrand]);

  const refreshBrand = useCallback(() => {
    loadBrand(getCurrentBrand());
  }, [loadBrand]);

  const brandConfig = getBrandConfig(brand?.slug || currentSlug);

  return (
    <BrandContext.Provider value={{ brand, brandConfig, isLoading, error, currentSlug, refreshBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand deve ser usado dentro de um BrandProvider');
  }
  return context;
};
```

### `src/contexts/SearchContext.tsx`

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');

  const clearSearch = () => setSearchQuery('');

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
```

### `src/types/index.ts`

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  colors: string[];
  sizes: string[];
  rating: number;
  reviews: number;
  isNew?: boolean;
  is_tabaco?: boolean;
  discount?: number;
}

export interface CartItem extends Product {
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

export interface FilterState {
  dimensions: Record<string, string[]>;
  priceRange: [number, number] | null;
  sort: string;
}
```

### `src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### `src/config/brands.ts`

```typescript
// Configurações das marcas do sistema multi-tenant

export interface FaviconConfig {
  ico?: string;
  svg?: string;
  png16?: string;
  png32?: string;
  appleTouchIcon?: string;
  android192?: string;
  android512?: string;
}

export interface BrandConfig {
  slug: string;
  name: string;
  domain: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    themeColor?: string;
    font: string;
    logo: string;
    favicon: string;
    favicons?: FaviconConfig;
  };
  features: {
    loyalty: boolean;
    reviews: boolean;
    giftCards: boolean;
    installments: boolean;
  };
  settings: {
    minOrderValue: number;
    maxInstallments: number;
    freeShippingThreshold: number;
  };
}

export const BRAND_CONFIGS: Record<string, BrandConfig> = {
  sesh: {
    slug: 'sesh',
    name: 'Sesh Store',
    domain: 'seshstore.com.br',
    theme: {
      primaryColor: '#41BAC2',
      secondaryColor: '#000000',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A1A',
      themeColor: '#41BAC2',
      font: 'Inter',
      logo: '/logos/sesh.png',
      favicon: '/favicons/sesh.ico',
      favicons: {
        ico: '/favicons/sesh.ico',
        svg: '/favicons/sesh.svg',
        png32: '/favicons/sesh-32x32.png',
        appleTouchIcon: '/favicons/sesh-180x180.png',
        android192: '/favicons/sesh-192x192.png',
        android512: '/favicons/sesh-512x512.png',
      },
    },
    features: {
      loyalty: true,
      reviews: true,
      giftCards: true,
      installments: true,
    },
    settings: {
      minOrderValue: 50.00,
      maxInstallments: 12,
      freeShippingThreshold: 300.00,
    },
  },
  grupogot: {
    slug: 'grupogot',
    name: 'Grupo GOT',
    domain: 'grupogot.com',
    theme: {
      primaryColor: '#000000',
      secondaryColor: '#FFFFFF',
      backgroundColor: '#FAFAFA',
      textColor: '#333333',
      themeColor: '#000000',
      font: 'Inter',
      logo: '/logos/grupogot.svg',
      favicon: '/favicons/grupogot.ico',
      favicons: {
        ico: '/favicons/grupogot.ico',
        svg: '/favicons/grupogot.svg',
        png32: '/favicons/grupogot-32x32.png',
        appleTouchIcon: '/favicons/grupogot-180x180.png',
        android192: '/favicons/grupogot-192x192.png',
        android512: '/favicons/grupogot-512x512.png',
      },
    },
    features: {
      loyalty: true,
      reviews: true,
      giftCards: true,
      installments: true,
    },
    settings: {
      minOrderValue: 50.00,
      maxInstallments: 12,
      freeShippingThreshold: 300.00,
    },
  },
  theog: {
    slug: 'theog',
    name: 'The OG',
    domain: 'theog.com.br',
    theme: {
      primaryColor: '#6A226C',
      secondaryColor: '#000000',
      backgroundColor: '#FFFFFF',
      textColor: '#2D2D2D',
      themeColor: '#6A226C',
      font: 'Inter',
      logo: '/logos/theog.png',
      favicon: '/favicons/theog.ico',
      favicons: {
        ico: '/favicons/theog.ico',
        svg: '/favicons/theog.svg',
        png32: '/favicons/theog-32x32.png',
        appleTouchIcon: '/favicons/theog-180x180.png',
        android192: '/favicons/theog-192x192.png',
        android512: '/favicons/theog-512x512.png',
      },
    },
    features: {
      loyalty: true,
      reviews: true,
      giftCards: true,
      installments: true,
    },
    settings: {
      minOrderValue: 50.00,
      maxInstallments: 12,
      freeShippingThreshold: 300.00,
    },
  },
};

export const DEFAULT_BRAND = 'sesh';

export const getBrandConfig = (slug: string): BrandConfig => {
  return BRAND_CONFIGS[slug] || BRAND_CONFIGS[DEFAULT_BRAND];
};
```

### `src/hooks/useProducts.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type Product } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export function useProducts() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, price, compare_at_price),
          category_products(categories(id, name, slug))
        `)
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useProduct(id: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['product', id, brand?.id],
    queryFn: async () => {
      if (!id) return null;

      let query = supabase
        .from('products')
        .select(`
          *,
          product_images(id, url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, active, price, compare_at_price)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .eq('active', true);

      if (brand?.id) {
        query = query.eq('brand_id', brand.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProductsByCategorySlug(categorySlug: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'category-slug', categorySlug, brand?.id],
    queryFn: async () => {
      if (!brand?.id || !categorySlug) return [];

      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id, parent_id')
        .eq('slug', categorySlug)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (categoryError || !category) return [];

      const { data: subcategories } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', category.id)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true);

      const categoryIds = [
        category.id,
        ...((subcategories || []).map((s: any) => s.id)),
      ];

      const { data, error } = await supabase
        .from('category_products')
        .select(`
          position,
          category_id,
          products(
            *,
            product_images(id, url, alt_text, position),
            product_variants(id, color, color_hex, size, sku, stock, active, price, compare_at_price),
            category_products(categories(id, name, slug))
          )
        `)
        .in('category_id', categoryIds)
        .order('position', { ascending: true });

      if (error) throw error;

      const uniqueProducts = new Map<string, any>();
      (data || []).forEach((item: any) => {
        const p = item.products;
        if (p && p.active && !p.deleted_at && !uniqueProducts.has(p.id)) {
          uniqueProducts.set(p.id, p);
        }
      });

      return Array.from(uniqueProducts.values());
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!categorySlug && !!brand?.id,
  });
}

/** @deprecated Use useProductsByCategorySlug instead */
export const useProductsByCollection = useProductsByCategorySlug;

export function useProductsByCategory(category: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'category', category, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!category && !!brand?.id,
  });
}

export function useFeaturedProducts() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'featured', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, price, compare_at_price)
        `)
        .is('deleted_at', null)
        .eq('featured', true)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .limit(8);

      if (error) throw error;
      return data as any[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useProductSuggestions(productId: string) {
  return useQuery({
    queryKey: ['product-suggestions', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_suggestions')
        .select(`
          position,
          suggested_product:products!product_suggestions_suggested_product_id_fkey(
            *,
            product_images(url, alt_text, position),
            product_variants(id, color, color_hex, size, sku, stock, price, compare_at_price)
          )
        `)
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.suggested_product)
        .filter((p: any) => p && p.active && !p.deleted_at);
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSearchProducts(query: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'search', query, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('active', true)
        .eq('brand_id', brand.id);

      if (error) throw error;
      return data as Product[];
    },
    enabled: query.length > 2 && !!brand?.id,
  });
}
```

### `src/hooks/useFavorites.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';

interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  brand_id: string;
  created_at: string;
}

export function useFavorites() {
  const { brand } = useBrand();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites', user?.id, brand?.id],
    queryFn: async () => {
      if (!user?.id || !brand?.id) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select('id, product_id, created_at')
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Pick<Favorite, 'id' | 'product_id' | 'created_at'>[];
    },
    enabled: !!user?.id && !!brand?.id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useIsFavorite(productId: string) {
  const { data: favorites } = useFavorites();
  return favorites?.some((f) => f.product_id === productId) ?? false;
}

export function useFavoritesCount() {
  const { data: favorites } = useFavorites();
  return favorites?.length ?? 0;
}

export function useToggleFavorite() {
  const { brand } = useBrand();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id || !brand?.id) throw new Error('Usuário não autenticado');

      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'removed' as const, productId };
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId,
            brand_id: brand.id,
          });

        if (error) throw error;
        return { action: 'added' as const, productId };
      }
    },

    onMutate: async (productId) => {
      const queryKey = ['favorites', user?.id, brand?.id];

      await queryClient.cancelQueries({ queryKey });

      const previousFavorites = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
        if (!old) return old;
        const exists = old.some((f) => f.product_id === productId);
        if (exists) {
          return old.filter((f) => f.product_id !== productId);
        } else {
          return [
            { id: 'optimistic', product_id: productId, created_at: new Date().toISOString() },
            ...old,
          ];
        }
      });

      return { previousFavorites };
    },

    onError: (_err, _productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          ['favorites', user?.id, brand?.id],
          context.previousFavorites
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id, brand?.id] });
    },
  });
}
```

### `src/hooks/useTheme.ts`

```typescript
import { useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';

export function useApplyBrandTheme() {
  const { brand, brandConfig } = useBrand();

  useEffect(() => {
    const theme = brand?.theme || brandConfig.theme;

    if (theme) {
      const root = document.documentElement;

      root.style.setProperty('--color-brand-primary', theme.primaryColor || '#000000');
      root.style.setProperty('--color-brand-secondary', theme.secondaryColor || '#000000');
      root.style.setProperty('--color-brand-background', theme.backgroundColor || '#FFFFFF');
      root.style.setProperty('--color-brand-text', theme.textColor || '#333333');

      root.style.setProperty('--color-sesh-cyan', theme.primaryColor || '#000000');

      if (theme.font) {
        root.style.setProperty('--font-brand', theme.font);
      }

      if (brand?.name || brandConfig.name) {
        document.title = `${brand?.name || brandConfig.name} | Loja Oficial`;
      }

      updateFavicons(theme);

      updateMetaTag('theme-color', theme.themeColor || theme.primaryColor || '#000000');
    }
  }, [brand, brandConfig]);
}

function updateLinkTag(rel: string, href: string | undefined, type?: string, sizes?: string) {
  if (!href) return;

  let link = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`) as HTMLLinkElement;

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    if (sizes) link.setAttribute('sizes', sizes);
    document.head.appendChild(link);
  }

  link.href = href;
  if (type) link.type = type;
}

function updateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }

  meta.content = content;
}

function updateFavicons(theme: any) {
  const favicons = theme.favicons || {};

  const mainFavicon = favicons.svg || favicons.ico || theme.favicon;
  if (mainFavicon) {
    const existingFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (existingFavicon) {
      existingFavicon.remove();
    }

    if (favicons.svg) {
      updateLinkTag('icon', favicons.svg, 'image/svg+xml');
    } else if (favicons.ico || theme.favicon) {
      updateLinkTag('icon', favicons.ico || theme.favicon, 'image/x-icon');
    }
  }

  if (favicons.png16) {
    updateLinkTag('icon', favicons.png16, 'image/png', '16x16');
  }
  if (favicons.png32) {
    updateLinkTag('icon', favicons.png32, 'image/png', '32x32');
  }

  if (favicons.appleTouchIcon) {
    updateLinkTag('apple-touch-icon', favicons.appleTouchIcon, undefined, '180x180');
  }
}

export function useBrandColors() {
  const { brand, brandConfig } = useBrand();
  const theme = brand?.theme || brandConfig.theme;

  return {
    primaryColor: theme?.primaryColor || '#000000',
    secondaryColor: theme?.secondaryColor || '#000000',
    backgroundColor: theme?.backgroundColor || '#FFFFFF',
    textColor: theme?.textColor || '#333333',
  };
}
```

### `src/hooks/useFuzzySearch.ts`

```typescript
import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { useProducts } from './useProducts';

export function useFuzzySearch(searchQuery: string) {
  const { data: products = [], isLoading, error } = useProducts();

  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'description', weight: 1 },
        { name: 'category', weight: 0.5 },
      ],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 2,
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: true,
    });
  }, [products]);

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return products;
    }

    const results = fuse.search(searchQuery);

    return results.map(result => result.item);
  }, [fuse, searchQuery, products]);

  return {
    products: searchResults,
    isLoading,
    error,
    totalResults: searchResults.length,
    isSearching: searchQuery.trim().length >= 2,
  };
}
```

### `src/hooks/useCollections.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface Collection {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  redirect_url: string | null;
  button_text: string | null;
  show_button: boolean;
  position: number;
  featured: boolean;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
}

export function useHeroCollection() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['collections', 'hero', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('position', { ascending: true })
        .limit(1);

      if (error) throw error;
      return data?.[0] as Collection | null;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useActiveCollections() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['collections', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as Collection[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useProductsByCollectionSlug(collectionSlug: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'collection-slug', collectionSlug, brand?.id],
    queryFn: async () => {
      if (!brand?.id || !collectionSlug) return [];

      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('id')
        .eq('slug', collectionSlug)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (collectionError || !collection) return [];

      const { data, error } = await supabase
        .from('product_collections')
        .select(`
          position,
          products(
            *,
            product_images(id, url, alt_text, position),
            product_variants(id, color, color_hex, size, sku, stock, active, price, compare_at_price),
            category_products(categories(id, name, slug))
          )
        `)
        .eq('collection_id', collection.id)
        .order('position', { ascending: true });

      if (error) throw error;

      const uniqueProducts = new Map<string, any>();
      (data || []).forEach((item: any) => {
        const p = item.products;
        if (p && p.active && !p.deleted_at && !uniqueProducts.has(p.id)) {
          uniqueProducts.set(p.id, p);
        }
      });

      return Array.from(uniqueProducts.values());
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!collectionSlug && !!brand?.id,
  });
}
```

### `src/hooks/useCategories.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface Category {
  id: string;
  brand_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  banner_mobile_url: string | null;
  icon: string | null;
  position: number;
  active: boolean;
  featured: boolean;
  show_in_menu: boolean;
  is_tabacaria?: boolean;
  children?: Category[];
}

function buildCategoryTree(categories: Category[]): Category[] {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(category);
    } else {
      rootCategories.push(category);
    }
  });

  const sortByPosition = (a: Category, b: Category) => (a.position || 0) - (b.position || 0);
  rootCategories.sort(sortByPosition);
  rootCategories.forEach(cat => cat.children?.sort(sortByPosition));

  return rootCategories;
}

export function useCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useCategoryTree() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'tree', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return buildCategoryTree(data as Category[]);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useMenuCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'menu', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('show_in_menu', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return buildCategoryTree(data as Category[]);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useFeaturedCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'featured', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('featured', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true })
        .limit(6);

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useCategory(categorySlug: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['category', categorySlug, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          category_products(
            product_id,
            position,
            products(
              *,
              product_images(url, alt_text, position),
              product_variants(id, color, color_hex, size, sku, stock)
            )
          )
        `)
        .eq('slug', categorySlug)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!categorySlug && !!brand?.id,
  });
}

export function useSubcategories(parentId: string | null) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'children', parentId, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      let query = supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useTabacariaCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'tabacaria', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*, category_products!inner(product_id)')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('featured', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return (data as any[]).map(({ category_products: _cp, ...rest }) => rest) as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/** @deprecated Use useCategories instead */
export const useCollections = useCategories;
/** @deprecated Use useFeaturedCategories instead */
export const useFeaturedCollections = useFeaturedCategories;
/** @deprecated Use useCategory instead */
export const useCollection = useCategory;
```

### `src/hooks/useBanners.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface Banner {
  id: string;
  brand_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  position: number;
  active: boolean;
}

export function useBanners() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['banners', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as Banner[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

export function useHeroBanner() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['banners', 'hero', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .limit(1);

      if (error) throw error;
      return data?.[0] as Banner | null;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}
```

### `src/hooks/useFooterLinks.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface FooterLink {
  id: string;
  group_name: string;
  label: string;
  url: string | null;
  icon: string | null;
  is_external: boolean;
  position: number;
}

export function useFooterLinks() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['footer-links', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('footer_links')
        .select('id, group_name, label, url, icon, is_external, position')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as FooterLink[];
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}

export function useGroupedFooterLinks() {
  const query = useFooterLinks();

  const grouped = (query.data || []).reduce<Record<string, FooterLink[]>>((acc, link) => {
    if (!acc[link.group_name]) acc[link.group_name] = [];
    acc[link.group_name].push(link);
    return acc;
  }, {});

  return { ...query, data: grouped };
}
```

### `src/hooks/useFAQs.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  position: number;
}

export function useFAQs() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['faqs', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('store_faqs')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as FAQ[];
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}

export function useFAQsByCategory(category: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['faqs', 'category', category, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('store_faqs')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .eq('category', category)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as FAQ[];
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id && !!category,
  });
}

export function useFAQCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['faqs', 'categories', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('store_faqs')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('active', true);

      if (error) throw error;
      const categories = [...new Set((data || []).map((d: any) => d.category || 'geral'))];
      return categories;
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}
```

### `src/components/BrandLink.tsx`

```typescript
import React from 'react';
import { Link, LinkProps, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';

interface BrandLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

const isLocalDev = () => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'dev-site.grupogot.com'
  );
};

export const BrandLink: React.FC<BrandLinkProps> = ({ to, children, ...props }) => {
  const { currentSlug } = useBrand();

  const brandedPath = isLocalDev() ? `/${currentSlug}${to.startsWith('/') ? to : '/' + to}` : to;

  return (
    <Link to={brandedPath} {...props}>
      {children}
    </Link>
  );
};

export const useBrandUrl = () => {
  const { currentSlug } = useBrand();

  const buildUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    return isLocalDev() ? `/${currentSlug}${normalizedPath}` : normalizedPath;
  };

  return { buildUrl, currentSlug, isLocalDev: isLocalDev() };
};

export const useBrandNavigate = () => {
  const navigate = useRouterNavigate();
  const { currentSlug } = useBrand();

  const brandNavigate = (to: string | number, options?: { replace?: boolean; state?: any }) => {
    if (typeof to === 'number') {
      navigate(to);
      return;
    }

    const normalizedPath = to.startsWith('/') ? to : '/' + to;
    const brandedPath = isLocalDev() ? `/${currentSlug}${normalizedPath}` : normalizedPath;
    navigate(brandedPath, options);
  };

  return brandNavigate;
};

export default BrandLink;
```

### `src/components/SearchPreview.tsx`

*(Arquivo completo — 139 linhas — incluído acima na leitura, sem truncamento)*

```typescript
import React from 'react';
import { useFuzzySearch } from '../hooks/useFuzzySearch';
import { useBrandNavigate } from './BrandLink';
import { useBrandColors } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';

interface SearchPreviewProps {
  searchQuery: string;
  onClose: () => void;
  onSelectProduct: (productId: string) => void;
}

export const SearchPreview: React.FC<SearchPreviewProps> = ({
  searchQuery,
  onClose,
  onSelectProduct,
}) => {
  const { products, isLoading } = useFuzzySearch(searchQuery);
  const navigate = useBrandNavigate();
  const { primaryColor } = useBrandColors();
  const { user } = useAuth();

  const previewProducts = products
    .filter((p: any) => !p.is_tabaco || user)
    .slice(0, 6);

  if (!searchQuery || searchQuery.trim().length < 2) {
    return null;
  }

  const handleProductClick = (productId: string) => {
    onSelectProduct(productId);
    navigate(`/product/${productId}`);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl z-50 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: primaryColor }} />
            <p className="mt-2 text-sm text-gray-500">Buscando...</p>
          </div>
        ) : previewProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum produto encontrado para "{searchQuery}"</p>
          </div>
        ) : (
          <div className="py-2">
            {previewProducts.map((product: any) => {
              const productImages = product.product_images || [];
              const sortedImages = [...productImages].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
              const imageUrl = sortedImages[0]?.url || product.images?.[0];
              const price = Number(product.price) || 0;
              const originalPrice = product.original_price ? Number(product.original_price) : null;
              const hasDiscount = originalPrice && originalPrice > price;

              return (
                <button key={product.id} onClick={() => handleProductClick(product.id)} className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="text-gray-400 text-xs text-center p-2">Sem imagem</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate mb-1">{product.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color: primaryColor }}>R$ {price.toFixed(2)}</span>
                      {hasDiscount && <span className="text-xs text-gray-400 line-through">R$ {originalPrice.toFixed(2)}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
            {products.filter((p: any) => !p.is_tabaco || user).length > 6 && (
              <div className="border-t mt-2 pt-2 px-4 pb-3">
                <button onClick={() => { navigate('/shop'); onClose(); }} className="w-full text-center text-sm font-medium py-2 rounded transition-colors hover:bg-gray-50" style={{ color: primaryColor }}>
                  Ver todos os {products.filter((p: any) => !p.is_tabaco || user).length} resultados
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
```

### `src/components/LoginModal.tsx`

*(497 linhas — conteúdo completo incluído acima na leitura)*

### `src/components/UserMenu.tsx`

*(123 linhas — conteúdo completo incluído acima na leitura)*

### `src/components/FreeShippingBanner.tsx`

*(71 linhas — conteúdo completo incluído acima na leitura)*

### `src/components/FreeShippingProgress.tsx`

*(142 linhas — conteúdo completo incluído acima na leitura)*

### `src/components/AgeVerificationPopup.tsx`

*(102 linhas — conteúdo completo incluído acima na leitura)*

### `src/components/PromoPopup.tsx`

*(165 linhas — conteúdo completo incluído acima na leitura)*

### `src/components/ErrorBoundary.tsx`

```typescript
import React from 'react';

interface EBProps {
  children: React.ReactNode;
}

interface EBState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<EBProps, EBState> {
  declare state: EBState;
  declare props: EBProps & { children: React.ReactNode };

  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return React.createElement('div', {
      className: 'min-h-screen flex items-center justify-center bg-gray-50 px-4',
    },
      React.createElement('div', { className: 'text-center max-w-md' },
        React.createElement('h1', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 'Algo deu errado'),
        React.createElement('p', { className: 'text-gray-600 mb-6' }, 'Ocorreu um erro inesperado. Tente recarregar a página.'),
        React.createElement('div', { className: 'flex gap-3 justify-center' },
          React.createElement('button', {
            onClick: () => window.location.reload(),
            className: 'px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors',
          }, 'Recarregar página'),
          React.createElement('button', {
            onClick: () => { window.location.hash = '/'; window.location.reload(); },
            className: 'px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors',
          }, 'Ir para início'),
        ),
      ),
    );
  }
}
```

### `src/components/ProtectedRoute.tsx`

```typescript
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm text-center">
          Você precisa estar logado para acessar esta página.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
```

### `src/components/ToastNotification.tsx`

```typescript
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, ToastType } from '../stores/toastStore';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-blue-500" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
};

export const ToastNotification: React.FC = () => {
  const { toasts, removeToast, flushPendingToasts } = useToastStore();

  useEffect(() => {
    flushPendingToasts();
  }, [flushPendingToasts]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm max-w-sm ${bgColors[toast.type]}`}
          >
            {icons[toast.type]}
            <span className="text-sm font-medium text-gray-800 flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0" aria-label="Fechar">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
```

### `src/components/MarqueeBanner.tsx`

*(84 linhas — conteúdo completo incluído acima na leitura)*

### `src/components/ProductSectionWithTabs.tsx`

*(267 linhas — conteúdo completo incluído acima na leitura)*

### `src/pages/CheckoutPage.tsx`

*(320 linhas — conteúdo completo incluído acima na leitura)*

### `package.json` (dependencies e devDependencies)

```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@supabase/supabase-js": "^2.91.0",
    "@tanstack/react-query": "^5.90.19",
    "@tanstack/react-query-devtools": "^5.91.3",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.31.0",
    "fuse.js": "^7.1.0",
    "lucide-react": "^0.562.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "react-hook-form": "^7.71.1",
    "react-router-dom": "^7.12.0",
    "tailwind-merge": "^3.4.0",
    "zod": "^4.3.6",
    "zustand": "^5.0.10"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.18",
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "autoprefixer": "^10.4.23",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.18",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```

### `vite.config.ts`

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3011,
        host: '0.0.0.0',
        strictPort: true,
        allowedHosts: ['dev-site.grupogot.com'],
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
```

---

## 3. Análise de Dependências entre Componentes

### Output dos greps de dependências

```
=== useCart() ===
src/app/App.tsx:560:  const { cart, removeFromCart, isCartOpen, setIsCartOpen, cartCount } = useCart();
src/app/App.tsx:791:  const { cartCount, setIsCartOpen } = useCart();
src/app/App.tsx:1574:  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
src/app/App.tsx:2949:  const { addToCart, setIsCartOpen } = useCart();

=== useCartStore ===
src/components/MinOrderValueWarning.tsx:11:  const { cartTotal, isMinOrderValueMet } = useCartStore();
src/components/checkout/ShippingMethodSelector.tsx:20:  const cart = useCartStore((s) => s.cart);
src/components/checkout/ShippingMethodSelector.tsx:21:  const storedSubtotal = useCartStore((s) => s.cartSubtotal);
src/components/checkout/ShippingMethodSelector.tsx:22:  const cartSetShipping = useCartStore((s) => s.setShipping);
src/components/checkout/OrderReview.tsx:26:  const { cart, cartSubtotal, discountAmount, shippingCost, finalTotal, coupon } = useCartStore();
src/components/checkout/CheckoutSummary.tsx:22:  } = useCartStore();
src/hooks/useAsaasPayment.ts:23:  const cart = useCartStore((s) => s.cart);
src/app/App.tsx:50:  import { useCartStore, type CartItem as StoreCartItem } from '../stores/cartStore';
src/app/App.tsx:1589:  } = useCartStore();
src/app/App.tsx:3741:  } = useCartStore();
src/stores/cartStore.ts:78:  export const useCartStore = create<CartState>()(
src/stores/cartStore.ts:308:  useCartStore.setState({
src/pages/CheckoutPage.tsx:39:  const { cart, clearCart, finalTotal } = useCartStore();
src/pages/CheckoutPage.tsx:67:  const [cartHydrated, setCartHydrated] = useState(useCartStore.persist.hasHydrated());
src/pages/CheckoutPage.tsx:70:  const unsub = useCartStore.persist.onFinishHydration(() => setCartHydrated(true));
src/pages/CheckoutExample.tsx:26:  } = useCartStore();

=== useAuth() ===
src/components/ProductSectionWithTabs.tsx:101:  const { user } = useAuth();
src/components/ProductCard.tsx:25:  const { user } = useAuth();
src/components/ProtectedRoute.tsx:10:  const { user, loading } = useAuth();
src/components/LoginModal.tsx:16:  const { signIn, signUp } = useAuth();
src/components/checkout/CustomerInfoForm.tsx:29:  const { user, profile } = useAuth();
src/components/checkout/AddressForm.tsx:28:  const { user } = useAuth();
src/components/UserMenu.tsx:10:  const { user, profile, signOut, loading: authLoading } = useAuth();
src/components/AccountLayout.tsx:32:  const { user, profile, loading: authLoading } = useAuth();
src/components/SearchPreview.tsx:21:  const { user } = useAuth();
src/hooks/useCustomerProfile.ts:28:  const { user } = useAuth();
src/hooks/useCustomerProfile.ts:67:  const { user, refreshProfile } = useAuth();
src/hooks/useAddresses.ts:26:  const { user } = useAuth();
src/hooks/useAddresses.ts:49:  const { user } = useAuth();
src/hooks/useAddresses.ts:72:  const { user } = useAuth();
src/hooks/useAddresses.ts:97:  const { user } = useAuth();
src/hooks/useAsaasPayment.ts:25:  const { user } = useAuth();
src/hooks/useOrders.ts:123:  const { user } = useAuth();
src/hooks/useOrders.ts:162:  const { user } = useAuth();
src/hooks/useFavorites.ts:19:  const { user } = useAuth();
src/hooks/useFavorites.ts:63:  const { user } = useAuth();
src/app/App.tsx:377:  const { user } = useAuth();
src/app/App.tsx:795:  const { user, signOut } = useAuth();
src/app/App.tsx:1882:  const { user } = useAuth();
src/app/App.tsx:2321:  const { user } = useAuth();
src/app/App.tsx:2952:  const { user } = useAuth();
src/pages/ProfilePage.tsx:651:  const { user, profile: authProfile, loading: authLoading } = useAuth();
src/pages/OrderConfirmationPage.tsx:17:  const { user } = useAuth();
src/pages/FavoritesPage.tsx:34:  const { user } = useAuth();
src/pages/CheckoutPage.tsx:36:  const { user } = useAuth();

=== useBrand() ===
src/components/SEOHead.tsx:30,295:  const { brandConfig } = useBrand();
src/components/VariantSelector.tsx:64:  const { brand } = useBrand();
src/components/BrandLink.tsx:27,43,58:  const { currentSlug } = useBrand();
src/components/PriceDisplay.tsx:22:  const { brandConfig } = useBrand();
src/components/ProductCard.tsx:23:  const { brandConfig } = useBrand();
src/components/ShippingCalculator.tsx:22:  const { brandConfig } = useBrand();
src/components/AgeVerificationPopup.tsx:12:  const { brandConfig } = useBrand();
src/components/MinOrderValueWarning.tsx:10:  const { brandConfig } = useBrand();
src/components/LoginModal.tsx:17:  const { currentSlug } = useBrand();
src/components/PromoPopup.tsx:20,59:  const { brand } = useBrand();
src/components/FreeShippingBanner.tsx:8:  const { brandConfig } = useBrand();
src/components/checkout/ShippingMethodSelector.tsx:19:  const { brandConfig } = useBrand();
src/components/checkout/InstallmentSelector.tsx:17:  const { brandConfig } = useBrand();
src/components/FreeShippingProgress.tsx:15:  const { brandConfig } = useBrand();
src/hooks/* (todos os hooks de dados): const { brand } = useBrand();
src/app/App.tsx:792,1334,1880,2320,2951: const { brand, brandConfig } = useBrand();
src/pages/CheckoutPage.tsx:37:  const { currentSlug } = useBrand();
src/pages/FAQPage.tsx:49:  const { brandConfig } = useBrand();
src/pages/StaticPageRenderer.tsx:73:  const { brandConfig } = useBrand();

=== useSearch() ===
src/contexts/SearchContext.tsx:23:  export function useSearch()
src/app/App.tsx:794:  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
src/app/App.tsx:2322:  const { searchQuery, clearSearch } = useSearch();

=== useToastStore ===
src/components/LoginModal.tsx:19:  const addToast = useToastStore((s) => s.addToast);
src/components/checkout/PaymentModal.tsx:28:  const addToast = useToastStore((s) => s.addToast);
src/components/checkout/PixPaymentView.tsx:28:  const addToast = useToastStore((s) => s.addToast);
src/components/UserMenu.tsx:12:  const addToast = useToastStore((s) => s.addToast);
src/components/ToastNotification.tsx:19:  const { toasts, removeToast, flushPendingToasts } = useToastStore();
src/app/App.tsx:796:  const addToast = useToastStore((s: any) => s.addToast);
src/app/App.tsx:1311:  useToastStore.getState().queueToast(...);
src/pages/ProfilePage.tsx:141,280,575:  const addToast = useToastStore((s) => s.addToast);
src/pages/OrdersPage.tsx:144:  const addToast = useToastStore((s) => s.addToast);
src/pages/SettingsPage.tsx:56,164,229:  const addToast = useToastStore((s) => s.addToast);
src/pages/FavoritesPage.tsx:104:  const addToast = useToastStore((s) => s.addToast);
src/pages/CheckoutPage.tsx:40:  const addToast = useToastStore((s) => s.addToast);

=== useContext ===
src/contexts/SearchContext.tsx:24:  const context = useContext(SearchContext);
src/contexts/BrandContext.tsx:150:  const context = useContext(BrandContext);
src/contexts/AuthContext.tsx:426:  const context = useContext(AuthContext);
src/app/App.tsx:80:  const useCart = () => useContext(CartContext);

=== React.memo ===
(NENHUM USO ENCONTRADO)

=== persist ===
src/stores/cartStore.ts:2:  import { persist, createJSONStorage } from 'zustand/middleware';
src/stores/cartStore.ts:79:  persist(

=== window.dispatchEvent / CustomEvent ===
src/components/ProductCard.tsx:63:  window.dispatchEvent(new CustomEvent('open-login-modal'));
src/components/ProtectedRoute.tsx:15:  window.dispatchEvent(new CustomEvent('open-login-modal'));
src/components/checkout/CustomerInfoForm.tsx:99:  window.dispatchEvent(new CustomEvent('open-login-modal'));
src/app/App.tsx:436:  window.dispatchEvent(new CustomEvent('open-login-modal'));
src/app/App.tsx:3214:  window.dispatchEvent(new CustomEvent('open-login-modal'));
src/app/App.tsx:3567:  window.dispatchEvent(new CustomEvent('open-login-modal'));

=== lazy ===
(NENHUM USO DE React.lazy ENCONTRADO)
```

### Resumo da Análise por Contexto/Store

#### `useCartStore` (Zustand — persistido em localStorage)
| Componente | Valores Consumidos | Poderia usar seletor granular? |
|---|---|---|
| App.tsx (CartDrawer ~L560) | cart, removeFromCart, isCartOpen, setIsCartOpen, cartCount | SIM — usa useContext(CartContext) wrapper, mas internamente desestrutura tudo |
| App.tsx (Header ~L791) | cartCount, setIsCartOpen | SIM — já poderia ser `useCartStore(s => s.cartCount)` |
| App.tsx (CartPage ~L1574) | cart, updateQuantity, removeFromCart, clearCart + mais via useCartStore | PARCIAL |
| App.tsx (ProductPage ~L2949) | addToCart, setIsCartOpen | SIM |
| App.tsx (~L1589) | cartSubtotal, discountAmount, etc (via useCartStore destructure) | SIM — desestrutura objeto inteiro |
| App.tsx (~L3741) | cartSubtotal, discountAmount, etc (via useCartStore destructure) | SIM — desestrutura objeto inteiro |
| CheckoutPage.tsx | cart, clearCart, finalTotal | SIM |
| MinOrderValueWarning.tsx | cartTotal, isMinOrderValueMet | PARCIAL — desestrutura 2 valores |
| ShippingMethodSelector.tsx | cart, cartSubtotal, setShipping | SIM — JÁ USA SELETORES |
| OrderReview.tsx | cart, cartSubtotal, discountAmount, shippingCost, finalTotal, coupon | NÃO — precisa de muitos campos |
| CheckoutSummary.tsx | desestrutura muitos campos | NÃO — precisa de muitos campos |
| useAsaasPayment.ts | cart | SIM — JÁ USA SELETOR |

#### `AuthContext` (React Context)
| Componente | Valores Consumidos | Poderia usar seletor? |
|---|---|---|
| ProductSectionWithTabs | `user` apenas | SIM — contexto inteiro re-renderiza |
| ProductCard | `user` apenas | SIM — CRÍTICO, componente repetido muitas vezes |
| SearchPreview | `user` apenas | SIM |
| ProtectedRoute | `user`, `loading` | Aceitável |
| LoginModal | `signIn`, `signUp` | Aceitável (modal) |
| UserMenu | `user`, `profile`, `signOut`, `loading` | Aceitável (poucos renders) |
| AccountLayout | `user`, `profile`, `loading` | Aceitável |
| CustomerInfoForm | `user`, `profile` | Aceitável |
| AddressForm | `user` | SIM |
| Hooks (useFavorites, useOrders, etc) | `user` apenas | SIM |
| App.tsx (5 usos) | vários | Misto |

#### `BrandContext` (React Context)
| Componente | Valores Consumidos | Poderia usar seletor? |
|---|---|---|
| ~65 consumidores | `brand`, `brandConfig`, `currentSlug` | SIM — Contexto muda raramente, mas é o mais amplamente consumido |

#### `SearchContext` (React Context)
| Componente | Valores Consumidos |
|---|---|
| App.tsx Header | `searchQuery`, `setSearchQuery`, `clearSearch` |
| App.tsx ShopPage | `searchQuery`, `clearSearch` |

#### `useToastStore` (Zustand)
| Padrão | Observação |
|---|---|
| Maioria usa `useToastStore((s) => s.addToast)` | BOM — seletor granular já aplicado |
| ToastNotification usa `{ toasts, removeToast, flushPendingToasts }` | Aceitável — componente único |

---

## 4. Bundle Analysis

```
Tamanho total do src/: 924K

Linhas de App.tsx: 3835

Top 20 arquivos por linhas de código:
   261 src/pages/FavoritesPage.tsx
   267 src/components/ProductSectionWithTabs.tsx
   270 src/hooks/useProducts.ts
   287 src/hooks/useCategories.ts
   288 src/components/checkout/OrderReview.tsx
   300 src/components/VariantSelector.tsx
   303 src/components/ShippingCalculator.tsx
   303 src/pages/CheckoutExample.tsx
   314 src/components/SEOHead.tsx
   320 src/pages/CheckoutPage.tsx
   320 src/stores/cartStore.ts
   357 src/pages/SettingsPage.tsx
   391 src/components/checkout/AddressForm.tsx
   396 src/pages/OrdersPage.tsx
   431 src/contexts/AuthContext.tsx
   471 src/components/checkout/PaymentModal.tsx
   496 src/components/LoginModal.tsx
   665 src/pages/ProfilePage.tsx
  3835 src/app/App.tsx
 19296 total (todas as linhas TS/TSX)
```

---

## 5. Problemas Críticos Identificados

### 5.1 `App.tsx` com 3835 linhas (God Component)
O arquivo `src/app/App.tsx` contém **3835 linhas** — quase 20% de todo o código do projeto. Ele inclui inline:
- CartDrawer, CartPage, Header, Footer, HomePage, ShopPage, ProductPage
- CartContext + useCart wrapper (duplicação parcial do useCartStore)
- Roteamento completo

### 5.2 Zero uso de `React.memo`
Nenhum componente usa `React.memo`. Componentes como `ProductCard` (renderizado N vezes em listas) sofrem re-renders desnecessários quando `AuthContext` ou `BrandContext` mudam.

### 5.3 Zero uso de `React.lazy`
Nenhuma rota ou componente pesado usa code splitting. Todo o bundle é carregado upfront (LoginModal, CheckoutPage, ProfilePage, etc.).

### 5.4 `CartContext` duplica `useCartStore`
Em `App.tsx:80`, existe `const useCart = () => useContext(CartContext)` que wrapa o `useCartStore` num React Context. Isso força re-renders em TODOS os consumidores quando qualquer campo do cart muda (perde a granularidade dos seletores do Zustand).

### 5.5 `AuthContext` não suporta seletores
Todos os 30+ consumidores recebem o objeto inteiro `{ user, profile, userBrands, session, loading, signIn, signUp, ... }`. Uma mudança em `loading` re-renderiza `ProductCard`, `SearchPreview`, etc.

### 5.6 `BrandContext` consumido em 65+ locais
Apesar de mudar raramente, quando muda (ex: troca de marca ou refresh do DB) força re-render de toda a árvore.

### 5.7 `useFuzzySearch` carrega TODOS os produtos
O hook `useFuzzySearch` chama `useProducts()` que busca **todos os produtos** da marca. A instância do Fuse.js é recriada quando `products` muda.

### 5.8 Persistência do cart serializa campos computados
O `partialize` do cartStore persiste `cartSubtotal`, `cartTotal`, `discountAmount`, `finalTotal`, `cartCount` — todos derivados de `cart`. Isso duplica dados e pode causar inconsistência.
