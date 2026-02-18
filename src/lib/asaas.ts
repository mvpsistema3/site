// Serviço Asaas - chama a Edge Function do Supabase para criar cobranças

import { supabase } from './supabase';

export type BillingType = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

export interface AsaasCustomer {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}

export interface CreatePaymentInput {
  customer: AsaasCustomer;
  value: number;
  billingType: BillingType;
  description: string;
  brandSlug: string;
}

export interface AsaasPaymentResult {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixKey?: string;
  status: string;
}

/**
 * Cria uma cobrança no Asaas via Edge Function
 * Suporta PIX, Boleto e Cartão de Crédito (sandbox)
 */
export async function createAsaasPayment(input: CreatePaymentInput): Promise<AsaasPaymentResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL não configurado');
  }

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `Erro HTTP ${res.status}`);
  }

  return res.json();
}
