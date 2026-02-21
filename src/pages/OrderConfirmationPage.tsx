import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../hooks/useOrders';
import { useCheckoutStore } from '../hooks/useCheckout';
import { formatCurrency } from '../lib/currency.utils';

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { currentSlug } = useBrand();
  const { primaryColor } = useBrandColors();
  const { user } = useAuth();
  const checkoutResult = useCheckoutStore((s) => s.result);

  // For logged-in users, fetch order details
  const { data: order, isLoading } = useOrder(orderId || '');

  // Determine display data
  const orderNumber = order?.order_number || checkoutResult?.orderNumber || '';
  const paymentMethod = order?.payment_method || '';
  const total = order?.total || 0;
  const status = order?.payment_status || (checkoutResult?.type === 'card_confirmed' ? 'confirmed' : 'pending');

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg text-center">
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
        className="relative w-24 h-24 mx-auto mb-8"
      >
        {/* Outer ring */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: `${primaryColor}08`, border: `2px solid ${primaryColor}20` }}
        />
        {/* Inner circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <CheckCircle size={40} style={{ color: primaryColor }} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="text-2xl font-bold uppercase tracking-wide mb-2">Pedido confirmado!</h1>
        {orderNumber && (
          <p className="text-lg font-bold mb-1" style={{ color: primaryColor }}>
            {orderNumber}
          </p>
        )}
        <p className="text-gray-500 text-sm mb-8">
          {user
            ? 'Acompanhe o status do pedido na área "Meus Pedidos".'
            : 'Você receberá atualizações sobre o pedido por e-mail.'}
        </p>
      </motion.div>

      {/* Order details card */}
      {(order || total > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 text-left mb-8"
        >
          {total > 0 && (
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">Total</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
          )}
          {paymentMethod && (
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">Pagamento</span>
              <span className="font-medium capitalize">{paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito'}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span
              className="font-bold text-xs uppercase tracking-wide px-2.5 py-1 rounded-full"
              style={
                status === 'confirmed' || status === 'received'
                  ? { color: '#16a34a', backgroundColor: '#f0fdf4' }
                  : { color: '#ca8a04', backgroundColor: '#fefce8' }
              }
            >
              {status === 'confirmed' || status === 'received' ? 'Confirmado' : 'Processando'}
            </span>
          </div>
        </motion.div>
      )}

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="space-y-3"
      >
        {user && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/${currentSlug}/orders`)}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            <Package size={16} />
            Ver meus pedidos
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/${currentSlug}/shop`)}
          className="w-full py-3.5 rounded-xl border-2 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          <ShoppingBag size={16} />
          Continuar comprando
        </motion.button>
      </motion.div>

      {/* Trust seal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 flex items-center justify-center gap-1.5 text-gray-400"
      >
        <ShieldCheck size={14} />
        <span className="text-[10px] uppercase tracking-widest font-bold">Compra segura e protegida</span>
      </motion.div>
    </div>
  );
}
