/**
 * Checkout state machine — Zustand store with sessionStorage persistence.
 * State survives page refresh but clears when the tab/window closes.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CheckoutStep,
  CheckoutFormData,
  CheckoutResult,
  CustomerInfoData,
  ShippingAddressData,
  ShippingSelectionData,
  PaymentMethod,
  CHECKOUT_STEPS,
} from '../types/checkout.types';

const STEPS: CheckoutStep[] = ['identification', 'delivery', 'payment', 'review'];

const initialFormData: CheckoutFormData = {
  customerInfo: null,
  shippingAddress: null,
  shippingSelection: null,
  paymentMethod: null,
  installments: 1,
  couponCode: null,
  customerNotes: '',
  savedAddressId: null,
};

interface CheckoutState {
  currentStep: CheckoutStep;
  formData: CheckoutFormData;
  completedSteps: CheckoutStep[];
  isSubmitting: boolean;
  submitError: string | null;
  result: CheckoutResult | null;

  // Navigation
  setStep: (step: CheckoutStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  canGoToStep: (step: CheckoutStep) => boolean;
  getCurrentStepIndex: () => number;

  // Step data setters
  setCustomerInfo: (data: CustomerInfoData) => void;
  setShippingAddress: (data: ShippingAddressData) => void;
  setShippingSelection: (data: ShippingSelectionData) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setInstallments: (n: number) => void;
  setCouponCode: (code: string | null) => void;
  setCustomerNotes: (notes: string) => void;
  setSavedAddressId: (id: string | null) => void;

  // Submission
  setSubmitting: (v: boolean) => void;
  setSubmitError: (error: string | null) => void;
  setResult: (result: CheckoutResult) => void;

  // Reset
  resetCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      currentStep: 'identification',
      formData: { ...initialFormData },
      completedSteps: [],
      isSubmitting: false,
      submitError: null,
      result: null,

      getCurrentStepIndex: () => STEPS.indexOf(get().currentStep),

      canGoToStep: (step: CheckoutStep) => {
        const targetIndex = STEPS.indexOf(step);
        const currentIndex = STEPS.indexOf(get().currentStep);
        const { completedSteps } = get();

        // Can always go backward
        if (targetIndex < currentIndex) return true;

        // Can go forward only if all previous steps are completed
        for (let i = 0; i < targetIndex; i++) {
          if (!completedSteps.includes(STEPS[i])) return false;
        }
        return true;
      },

      setStep: (step: CheckoutStep) => {
        if (get().canGoToStep(step)) {
          set({ currentStep: step });
        }
      },

      goToNextStep: () => {
        const currentIndex = STEPS.indexOf(get().currentStep);
        if (currentIndex < STEPS.length - 1) {
          const current = get().currentStep;
          const completed = get().completedSteps;
          set({
            currentStep: STEPS[currentIndex + 1],
            completedSteps: completed.includes(current)
              ? completed
              : [...completed, current],
          });
        }
      },

      goToPreviousStep: () => {
        const currentIndex = STEPS.indexOf(get().currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEPS[currentIndex - 1] });
        }
      },

      setCustomerInfo: (data) =>
        set((s) => ({ formData: { ...s.formData, customerInfo: data } })),

      setShippingAddress: (data) =>
        set((s) => ({ formData: { ...s.formData, shippingAddress: data } })),

      setShippingSelection: (data) =>
        set((s) => ({ formData: { ...s.formData, shippingSelection: data } })),

      setPaymentMethod: (method) =>
        set((s) => ({ formData: { ...s.formData, paymentMethod: method } })),

      setInstallments: (n) =>
        set((s) => ({ formData: { ...s.formData, installments: n } })),

      setCouponCode: (code) =>
        set((s) => ({ formData: { ...s.formData, couponCode: code } })),

      setCustomerNotes: (notes) =>
        set((s) => ({ formData: { ...s.formData, customerNotes: notes } })),

      setSavedAddressId: (id) =>
        set((s) => ({ formData: { ...s.formData, savedAddressId: id } })),

      setSubmitting: (v) => set({ isSubmitting: v }),
      setSubmitError: (error) => set({ submitError: error }),
      setResult: (result) => set({ result }),

      resetCheckout: () =>
        set({
          currentStep: 'identification',
          formData: { ...initialFormData },
          completedSteps: [],
          isSubmitting: false,
          submitError: null,
          result: null,
        }),
    }),
    {
      name: 'checkout-session-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        formData: state.formData,
        completedSteps: state.completedSteps,
        result: state.result,
      }),
    }
  )
);
