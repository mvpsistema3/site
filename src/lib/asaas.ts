/**
 * Asaas Payment Service — calls the create-asaas-payment Edge Function.
 */

import { supabase } from './supabase';
import type { CreatePaymentRequest, PaymentResponse, PaymentErrorResponse } from '../types/checkout.types';

/**
 * Create a payment via the Asaas Edge Function.
 * Handles both authenticated and guest (anon key) requests.
 */
export async function createAsaasPayment(
  request: CreatePaymentRequest
): Promise<PaymentResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL não configurado');
  }

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch(`${supabaseUrl}/functions/v1/create-asaas-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || anonKey}`,
      'apikey': anonKey || '',
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let errorMessage = `Erro HTTP ${res.status}`;
    try {
      const err: PaymentErrorResponse = await res.json();
      console.error('[Asaas Payment Error]', JSON.stringify(err, null, 2));
      if (err.error?.asaasError?.errors) {
        const details = err.error.asaasError.errors.map((e: any) => e.description || e.code).join('; ');
        console.error('[Asaas Details]', details);
        errorMessage = details || err.error?.message || errorMessage;
      } else {
        errorMessage = err.error?.message || errorMessage;
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMessage);
  }

  return res.json();
}
