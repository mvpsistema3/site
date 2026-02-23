import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';
import { useCartStore } from '../stores/cartStore';
import { useCheckoutStore } from '../hooks/useCheckout';
import { useAsaasPayment } from '../hooks/useAsaasPayment';
import { useToastStore } from '../stores/toastStore';

import { CheckoutStepper } from '../components/checkout/CheckoutStepper';
import { CustomerInfoForm } from '../components/checkout/CustomerInfoForm';
import { AddressForm } from '../components/checkout/AddressForm';
import { ShippingMethodSelector } from '../components/checkout/ShippingMethodSelector';
import { PaymentMethodSelector } from '../components/checkout/PaymentMethodSelector';
import { CreditCardForm } from '../components/checkout/CreditCardForm';
import { InstallmentSelector } from '../components/checkout/InstallmentSelector';
import { OrderReview } from '../components/checkout/OrderReview';
import { PaymentModal } from '../components/checkout/PaymentModal';
import { CheckoutSummary } from '../components/checkout/CheckoutSummary';

import type { CreditCardData, ShippingAddressData, ShippingSelectionData, PaymentResponse, PaymentPixResponse } from '../types/checkout.types';

const stepAnimation = {
  initial: { opacity: 0, x: 24, y: 8 },
  animate: { opacity: 1, x: 0, y: 0 },
  exit: { opacity: 0, x: -24, y: 8 },
  transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentSlug } = useBrand();
  const { primaryColor } = useBrandColors();
  const { cart, clearCart, finalTotal, coupon } = useCartStore();
  const addToast = useToastStore((s) => s.addToast);
  const paymentMutation = useAsaasPayment();

  const {
    currentStep,
    formData,
    completedSteps,
    isSubmitting,
    result,
    setStep,
    goToNextStep,
    goToPreviousStep,
    canGoToStep,
    setShippingAddress,
    setShippingSelection,
    setPaymentMethod,
    setInstallments,
    setCouponCode,
    setSubmitting,
    setSubmitError,
    setResult,
    resetCheckout,
  } = useCheckoutStore();

  // Credit card data in ref only (never in global state)
  const creditCardRef = useRef<CreditCardData | null>(null);

  // Marca que houve pagamento concluído — impede o guard de redirecionar para /cart
  const paymentDoneRef = useRef(false);

  // Wait for cart store hydration before checking cart emptiness
  const cartHydrated = useCartStore((s) => s._hasHydrated);

  // Guard: redirect if cart is empty and no result (only after hydration)
  useEffect(() => {
    if (!cartHydrated) return;
    if (paymentDoneRef.current) return;
    if (cart.length === 0 && !result) {
      navigate(`/${currentSlug}/cart`, { replace: true });
    }
  }, [cartHydrated, cart.length, result, navigate, currentSlug]);

  // Sincronizar cupom do cartStore → checkoutStore
  // (cupom aplicado na página do carrinho precisa chegar no formData do checkout)
  useEffect(() => {
    if (coupon?.code && formData.couponCode !== coupon.code) {
      setCouponCode(coupon.code);
    } else if (!coupon && formData.couponCode) {
      setCouponCode(null);
    }
  }, [coupon, formData.couponCode, setCouponCode]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // NOTE: No longer resetting checkout on unmount — state persists in
  // sessionStorage so the user keeps their progress on page refresh.
  // resetCheckout() is called explicitly after successful order placement.

  // --- Step 2 handlers ---
  const addressCepRef = useRef('');

  const handleAddressReady = useCallback(
    (address: ShippingAddressData) => {
      setShippingAddress(address);
      addressCepRef.current = address.cep;
    },
    [setShippingAddress]
  );

  const handleShippingReady = useCallback(
    (data: ShippingSelectionData) => {
      setShippingSelection(data);
    },
    [setShippingSelection]
  );

  const handleDeliveryContinue = () => {
    if (!formData.shippingAddress || !formData.shippingSelection) {
      addToast('Selecione um endereço e uma opção de frete.', 'error');
      return;
    }
    goToNextStep();
  };

  // --- Step 3 handlers ---
  const handlePaymentContinue = () => {
    if (!formData.paymentMethod) {
      addToast('Selecione uma forma de pagamento.', 'error');
      return;
    }
    if (formData.paymentMethod === 'credit_card' && !creditCardRef.current) {
      addToast('Preencha os dados do cartão corretamente.', 'error');
      return;
    }
    goToNextStep();
  };

  // --- Submit order ---
  const handleSubmitOrder = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Timeout safety: abort if request takes longer than 90 seconds
      const timeoutMs = 90_000;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('O servidor demorou muito para responder. Por favor, tente novamente.')), timeoutMs)
      );

      const response: PaymentResponse = await Promise.race([
        paymentMutation.mutateAsync({
          formData,
          creditCardData: creditCardRef.current || undefined,
        }),
        timeout,
      ]);

      // Clear credit card data immediately
      creditCardRef.current = null;

      // Verifica se é resposta PIX: 'in' checa apenas existência da chave,
      // mas a API pode retornar pix: null em pagamentos com cartão
      if ('pix' in response && response.pix != null) {
        const pixResponse = response as PaymentPixResponse;
        setResult({
          type: 'pix',
          orderId: pixResponse.order_id,
          orderNumber: pixResponse.order_number,
          pix: pixResponse.pix,
          invoiceUrl: pixResponse.invoice_url,
        });
      } else {
        const isConfirmed = response.status === 'CONFIRMED';
        setResult({
          type: isConfirmed ? 'card_confirmed' : 'card_pending',
          orderId: response.order_id,
          orderNumber: response.order_number,
        });
        // Modal handles success state and navigation
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      console.error('[Checkout] Submit failed:', err);
      setSubmitError(message);
      addToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [formData, paymentMutation, clearCart, navigate, currentSlug, addToast, setSubmitting, setSubmitError, setResult]);

  // --- Main checkout flow ---
  return (
    <>
    <div className="container mx-auto px-4 py-8 md:py-10 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (currentStep === 'identification') {
              navigate(`/${currentSlug}/cart`);
            } else {
              goToPreviousStep();
            }
          }}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Voltar</span>
        </motion.button>

        <h1 className="text-sm font-bold uppercase tracking-widest text-gray-400">
          Checkout
        </h1>

        <div className="w-16" />
      </div>

      {/* Stepper */}
      <CheckoutStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={setStep}
        canNavigate={canGoToStep}
      />

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-8">
        {/* Left: Step content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {/* Step 1: Identification */}
            {currentStep === 'identification' && (
              <motion.div key="step-1" {...stepAnimation}>
                <CustomerInfoForm />
              </motion.div>
            )}

            {/* Step 2: Delivery */}
            {currentStep === 'delivery' && (
              <motion.div key="step-2" {...stepAnimation} className="space-y-6">
                <AddressForm onAddressReady={handleAddressReady} />
                <ShippingMethodSelector
                  cep={formData.shippingAddress?.cep || addressCepRef.current}
                  onShippingReady={handleShippingReady}
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeliveryContinue}
                  disabled={!formData.shippingAddress || !formData.shippingSelection}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar
                </motion.button>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 'payment' && (
              <motion.div key="step-3" {...stepAnimation} className="space-y-6">
                <PaymentMethodSelector
                  selected={formData.paymentMethod}
                  onSelect={setPaymentMethod}
                />
                {formData.paymentMethod === 'credit_card' && (
                  <>
                    <CreditCardForm
                      onCardDataChange={(data) => {
                        creditCardRef.current = data;
                      }}
                    />
                    <InstallmentSelector
                      totalAmount={finalTotal}
                      selected={formData.installments}
                      onSelect={setInstallments}
                    />
                  </>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePaymentContinue}
                  disabled={!formData.paymentMethod}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar
                </motion.button>
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 'review' && (
              <motion.div key="step-4" {...stepAnimation}>
                <OrderReview onSubmit={handleSubmitOrder} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Summary sidebar */}
        <div className="lg:col-span-1">
          <CheckoutSummary />
        </div>
      </div>
    </div>

    {/* Payment result modal (PIX / Card) */}
    <PaymentModal
      result={result}
      onPaymentConfirmed={() => clearCart()}
      onNavigateToOrder={() => {
        const orderId = result?.orderId;
        paymentDoneRef.current = true;
        resetCheckout();
        navigate(user
          ? `/${currentSlug}/orders`
          : `/${currentSlug}/order-confirmation/${orderId}`
        );
      }}
      onContinueShopping={() => {
        paymentDoneRef.current = true;
        resetCheckout();
        navigate(`/${currentSlug}/shop`);
      }}
    />
    </>
  );
}
