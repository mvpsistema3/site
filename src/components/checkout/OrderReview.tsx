import { motion } from 'framer-motion';
import { Edit3, Lock, Loader2, ShieldCheck, CreditCard, Truck } from 'lucide-react';
import { useCheckoutStore } from '../../hooks/useCheckout';
import { useCartStore } from '../../stores/cartStore';
import { useBrandColors } from '../../hooks/useTheme';
import { formatCurrency } from '../../lib/currency.utils';
import { formatCPF } from '../../lib/cpf';
import { formatPhone } from '../../lib/utils';
import type { CheckoutStep } from '../../types/checkout.types';

interface OrderReviewProps {
  onSubmit: () => void;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export function OrderReview({ onSubmit }: OrderReviewProps) {
  const { formData, setStep, isSubmitting, submitError, setCustomerNotes } = useCheckoutStore();
  const { cart, cartSubtotal, discountAmount, shippingCost, finalTotal, coupon } = useCartStore();
  const { primaryColor } = useBrandColors();

  const customer = formData.customerInfo;
  const address = formData.shippingAddress;
  const shipping = formData.shippingSelection;
  const paymentLabel = formData.paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito';
  const installmentsLabel =
    formData.paymentMethod === 'credit_card' && formData.installments > 1
      ? `${formData.installments}x de ${formatCurrency(finalTotal / formData.installments)}`
      : null;

  const handleEditSection = (step: CheckoutStep) => {
    setStep(step);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold uppercase tracking-wide">Revisão do pedido</h2>

      {/* Customer info */}
      <motion.div custom={0} variants={sectionVariants} initial="hidden" animate="visible">
        <Section
          title="Seus dados"
          onEdit={() => handleEditSection('identification')}
          primaryColor={primaryColor}
        >
          <p className="text-sm font-medium">{customer?.name}</p>
          <p className="text-sm text-gray-500">{customer?.email}</p>
          <p className="text-sm text-gray-500">
            CPF: {customer?.cpf ? formatCPF(customer.cpf) : '—'}
          </p>
          <p className="text-sm text-gray-500">
            Tel: {customer?.phone ? formatPhone(customer.phone) : '—'}
          </p>
        </Section>
      </motion.div>

      {/* Address */}
      <motion.div custom={1} variants={sectionVariants} initial="hidden" animate="visible">
        <Section
          title="Endereço de entrega"
          onEdit={() => handleEditSection('delivery')}
          primaryColor={primaryColor}
        >
          <p className="text-sm">
            {address?.street}, {address?.number}
            {address?.complement ? ` - ${address.complement}` : ''}
          </p>
          <p className="text-sm text-gray-500">
            {address?.neighborhood} — {address?.city}/{address?.state}
          </p>
          <p className="text-sm text-gray-500">CEP: {address?.cep}</p>
        </Section>
      </motion.div>

      {/* Shipping */}
      <motion.div custom={2} variants={sectionVariants} initial="hidden" animate="visible">
        <Section
          title="Frete"
          onEdit={() => handleEditSection('delivery')}
          primaryColor={primaryColor}
        >
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-gray-400" />
            <p className="text-sm">
              {shipping?.service_name} — {shipping?.delivery_days} dias úteis
            </p>
          </div>
          <p className="text-sm font-semibold mt-1">
            {shipping?.cost === 0 ? (
              <span className="text-green-600">Grátis</span>
            ) : (
              formatCurrency(shipping?.cost || 0)
            )}
          </p>
        </Section>
      </motion.div>

      {/* Payment */}
      <motion.div custom={3} variants={sectionVariants} initial="hidden" animate="visible">
        <Section
          title="Pagamento"
          onEdit={() => handleEditSection('payment')}
          primaryColor={primaryColor}
        >
          <div className="flex items-center gap-2">
            <CreditCard size={14} className="text-gray-400" />
            <p className="text-sm font-medium">{paymentLabel}</p>
          </div>
          {installmentsLabel && (
            <p className="text-sm text-gray-500 mt-0.5">{installmentsLabel}</p>
          )}
        </Section>
      </motion.div>

      {/* Cart items */}
      <motion.div custom={4} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-4">
            Itens ({cart.length})
          </h3>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex gap-3">
                <img
                  src={item.images?.[0] || '/placeholder.png'}
                  alt={item.name}
                  className="w-14 h-14 rounded-xl object-cover bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[item.selectedSize, item.selectedColor].filter(Boolean).join(' / ')}
                    {' — '}Qtd: {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Price breakdown */}
      <motion.div custom={5} variants={sectionVariants} initial="hidden" animate="visible">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2.5">
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
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Frete</span>
            <span>
              {shippingCost === 0 ? (
                <span className="text-green-600">Grátis</span>
              ) : (
                formatCurrency(shippingCost)
              )}
            </span>
          </div>
          <div className="border-t pt-3 mt-3 flex justify-between items-center">
            <span className="font-bold text-base">Total</span>
            <span
              className="font-bold text-lg px-3 py-1 rounded-lg"
              style={{ backgroundColor: `${primaryColor}08`, color: primaryColor }}
            >
              {formatCurrency(finalTotal)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Customer notes */}
      <motion.div custom={6} variants={sectionVariants} initial="hidden" animate="visible">
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
          Observações (opcional)
        </label>
        <textarea
          value={formData.customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          placeholder="Alguma observação sobre o pedido?"
          rows={2}
          className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm resize-none transition-all duration-200 focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2"
          style={{ '--tw-ring-color': `${primaryColor}30` } as any}
        />
      </motion.div>

      {/* Error message */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
        >
          {submitError}
        </motion.div>
      )}

      {/* Submit button */}
      <motion.button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-xl text-white font-bold text-base uppercase tracking-wide hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        style={{ backgroundColor: primaryColor }}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Lock size={16} />
            Confirmar pedido
          </>
        )}
      </motion.button>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 text-gray-400">
        <div className="flex items-center gap-1">
          <ShieldCheck size={14} />
          <span className="text-[10px] uppercase tracking-wide font-medium">Compra segura</span>
        </div>
        <div className="w-px h-3 bg-gray-200" />
        <div className="flex items-center gap-1">
          <Lock size={14} />
          <span className="text-[10px] uppercase tracking-wide font-medium">Dados criptografados</span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Ao confirmar, você concorda com nossos termos de uso e política de privacidade.
      </p>
    </div>
  );
}

// --- Helper component ---

function Section({
  title,
  onEdit,
  primaryColor,
  children,
}: {
  title: string;
  onEdit: () => void;
  primaryColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-[3px]"
      style={{ borderLeftColor: primaryColor }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium flex items-center gap-1 hover:underline underline-offset-4 transition-colors"
          style={{ color: primaryColor }}
        >
          <Edit3 size={12} />
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}
