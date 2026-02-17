import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
      name: 'sesh-cart-storage',
      onRehydrateStorage: () => (state) => {
        // Recalcula valores após carregar do localStorage
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
            finalTotal: total + shippingCost,
          });
        }
      },
    }
  )
);
