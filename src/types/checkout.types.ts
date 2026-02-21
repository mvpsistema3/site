// Checkout flow types for the Asaas payment integration

// --- Step definitions ---

export type CheckoutStep = 'identification' | 'delivery' | 'payment' | 'review';

export const CHECKOUT_STEPS: CheckoutStep[] = [
  'identification',
  'delivery',
  'payment',
  'review',
];

// --- Step 1: Customer identification ---

export interface CustomerInfoData {
  name: string;
  email: string;
  cpf: string;   // digits only (11 chars)
  phone: string;  // digits only (10-11 chars)
}

// --- Step 2: Delivery ---

export interface ShippingAddressData {
  recipient_name: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ShippingSelectionData {
  service_name: string;
  cost: number;
  delivery_days: number;
}

// --- Step 3: Payment ---

export type PaymentMethod = 'pix' | 'credit_card';

/** Credit card data — kept in LOCAL component state only, never in global store */
export interface CreditCardData {
  number: string;
  holder_name: string;
  expiry: string; // "MM/YY"
  cvv: string;
}

export interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

// --- Accumulated checkout state (excludes credit card data) ---

export interface CheckoutFormData {
  customerInfo: CustomerInfoData | null;
  shippingAddress: ShippingAddressData | null;
  shippingSelection: ShippingSelectionData | null;
  paymentMethod: PaymentMethod | null;
  installments: number;
  couponCode: string | null;
  customerNotes: string;
  savedAddressId: string | null;
}

// --- Edge function API contract ---

export interface CreatePaymentRequest {
  brand_slug: string;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
  }>;
  shipping_address: {
    recipient_name: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  shipping: {
    service_name: string;
    cost: number;
    delivery_days: number;
  };
  coupon_code?: string;
  payment: {
    method: PaymentMethod;
    credit_card?: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    };
    credit_card_holder_info?: CreditCardHolderInfo;
    installments?: number;
  };
  guest_info?: {
    name: string;
    email: string;
    cpf: string;
    phone: string;
  };
  customer_notes?: string;
}

export interface PaymentPixResponse {
  success: true;
  order_id: string;
  order_number: string;
  pix: {
    qr_code: string;    // base64 image
    payload: string;     // PIX copy-paste code
    expiration: string;  // ISO datetime
  };
  invoice_url: string;
}

export interface PaymentCardResponse {
  success: true;
  order_id: string;
  order_number: string;
  status: 'CONFIRMED' | 'PENDING';
}

export interface PaymentErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export type PaymentResponse = PaymentPixResponse | PaymentCardResponse;

// --- Post-payment result ---

export type CheckoutResult =
  | { type: 'pix'; orderId: string; orderNumber: string; pix: PaymentPixResponse['pix']; invoiceUrl: string }
  | { type: 'card_confirmed'; orderId: string; orderNumber: string }
  | { type: 'card_pending'; orderId: string; orderNumber: string };
