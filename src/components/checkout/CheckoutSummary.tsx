import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { useCheckoutStore } from '../../hooks/useCheckout';
import { useBrandColors } from '../../hooks/useTheme';
import { formatCurrency } from '../../lib/currency.utils';
import { CouponInput } from '../CouponInput';
import { MinOrderValueWarning } from '../MinOrderValueWarning';

export function CheckoutSummary() {
  const { primaryColor } = useBrandColors();
  const {
    cart,
    cartSubtotal,
    discountAmount,
    shippingCost,
    finalTotal,
    cartCount,
    coupon,
    shipping,
  } = useCartStore();
  const { setCouponCode } = useCheckoutStore();
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleCouponApplied = (discount: number, couponCode: string) => {
    setCouponCode(couponCode);
    applyCoupon(couponCode, discount);
  };

  const handleCouponRemoved = () => {
    setCouponCode(null);
    removeCoupon();
  };

  return (
    <div className="lg:sticky lg:top-24">
      {/* Mobile toggle */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm mb-4"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}12` }}
          >
            <ShoppingBag size={14} style={{ color: primaryColor }} />
          </div>
          <span className="font-bold text-sm uppercase tracking-wide">
            Resumo ({cartCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{formatCurrency(finalTotal)}</span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 text-gray-400 ${mobileOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </motion.button>

      {/* Content — always visible on desktop, toggle on mobile */}
      <div className={`${mobileOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
          {/* Header accent */}
          <div className="h-1" style={{ backgroundColor: primaryColor }} />

          <div className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Resumo do pedido</h3>

            {/* Cart items */}
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
              {cart.map((item) => (
                <div
                  key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
                  className="flex gap-3"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={item.images?.[0] || '/placeholder.png'}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                    />
                    <span
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {[item.selectedSize, item.selectedColor].filter(Boolean).join(' / ')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4">
              {/* Coupon input */}
              <CouponInput
                cartTotal={cartSubtotal}
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
              />
            </div>

            {/* Price breakdown */}
            <div className="border-t border-gray-100 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto {coupon ? `(${coupon.code})` : ''}</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {shipping && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frete</span>
                  <span>
                    {shippingCost === 0 ? (
                      <span className="text-green-600 font-medium">Grátis</span>
                    ) : (
                      formatCurrency(shippingCost)
                    )}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-bold text-base">Total</span>
                <span className="font-bold text-lg">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            {/* Min order warning */}
            <MinOrderValueWarning />
          </div>
        </div>
      </div>
    </div>
  );
}
