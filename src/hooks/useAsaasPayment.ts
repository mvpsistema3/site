/**
 * TanStack mutation for creating an Asaas payment via the Edge Function.
 */

import { useMutation } from '@tanstack/react-query';
import { createAsaasPayment } from '../lib/asaas';
import { useCartStore } from '../stores/cartStore';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import type {
  CheckoutFormData,
  CreditCardData,
  CreatePaymentRequest,
  PaymentResponse,
} from '../types/checkout.types';

interface SubmitPaymentParams {
  formData: CheckoutFormData;
  creditCardData?: CreditCardData;
}

export function useAsaasPayment() {
  const cart = useCartStore((s) => s.cart);
  const { currentSlug } = useBrand();
  const { user } = useAuth();

  return useMutation<PaymentResponse, Error, SubmitPaymentParams>({
    mutationFn: async ({ formData, creditCardData }) => {
      const items = cart.map((item) => ({
        product_id: item.id,
        variant_id: item.variantId,
        quantity: item.quantity,
      }));

      const request: CreatePaymentRequest = {
        brand_slug: currentSlug,
        items,
        shipping_address: formData.shippingAddress!,
        shipping: {
          service_name: formData.shippingSelection!.service_name,
          cost: formData.shippingSelection!.cost,
          delivery_days: formData.shippingSelection!.delivery_days,
        },
        payment: {
          method: formData.paymentMethod!,
        },
      };

      // Coupon
      if (formData.couponCode) {
        request.coupon_code = formData.couponCode;
      }

      // Customer notes
      if (formData.customerNotes) {
        request.customer_notes = formData.customerNotes;
      }

      // Credit card data (from local ref, not global state)
      if (formData.paymentMethod === 'credit_card' && creditCardData) {
        const [expiryMonth, expiryYear] = creditCardData.expiry.split('/');
        request.payment.credit_card = {
          holderName: creditCardData.holder_name,
          number: creditCardData.number.replace(/\s/g, ''),
          expiryMonth: expiryMonth.padStart(2, '0'),
          expiryYear: `20${expiryYear}`,
          ccv: creditCardData.cvv,
        };
        request.payment.credit_card_holder_info = {
          name: formData.customerInfo!.name,
          email: formData.customerInfo!.email,
          cpfCnpj: formData.customerInfo!.cpf,
          postalCode: formData.shippingAddress!.cep.replace(/\D/g, ''),
          addressNumber: formData.shippingAddress!.number,
          phone: formData.customerInfo!.phone.replace(/\D/g, ''),
        };
        if (formData.installments > 1) {
          request.payment.installments = formData.installments;
        }
      }

      // Guest info (when not logged in)
      if (!user) {
        request.guest_info = {
          name: formData.customerInfo!.name,
          email: formData.customerInfo!.email,
          cpf: formData.customerInfo!.cpf.replace(/\D/g, ''),
          phone: formData.customerInfo!.phone.replace(/\D/g, ''),
        };
      }

      return createAsaasPayment(request);
    },
  });
}
