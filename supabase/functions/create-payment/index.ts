// Supabase Edge Function para criação de cobranças via API Asaas (Sandbox)
// Protege a chave da API no servidor

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') || '';
const ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3';

interface CustomerData {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
}

interface CreatePaymentRequest {
  customer: CustomerData;
  value: number;
  billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
  description: string;
  brandSlug: string;
}

async function findOrCreateCustomer(customer: CustomerData): Promise<string> {
  // Busca cliente existente pelo CPF/CNPJ
  const searchRes = await fetch(
    `${ASAAS_BASE_URL}/customers?cpfCnpj=${customer.cpfCnpj.replace(/\D/g, '')}`,
    {
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.data && searchData.data.length > 0) {
      return searchData.data[0].id;
    }
  }

  // Cria novo cliente
  const createRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: customer.name,
      email: customer.email,
      cpfCnpj: customer.cpfCnpj.replace(/\D/g, ''),
      mobilePhone: customer.phone?.replace(/\D/g, ''),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Erro ao criar cliente: ${JSON.stringify(err)}`);
  }

  const created = await createRes.json();
  return created.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreatePaymentRequest = await req.json();
    const { customer, value, billingType, description } = body;

    if (!customer?.name || !customer?.email || !customer?.cpfCnpj) {
      return new Response(
        JSON.stringify({ error: 'Dados do cliente incompletos (nome, email, CPF obrigatórios)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!value || value <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valor inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Busca ou cria cliente no Asaas
    const customerId = await findOrCreateCustomer(customer);

    // Data de vencimento: hoje + 1 dia
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Cria cobrança
    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value,
        dueDate: dueDateStr,
        description,
        externalReference: `brand_${body.brandSlug}_${Date.now()}`,
      }),
    });

    if (!paymentRes.ok) {
      const err = await paymentRes.json();
      throw new Error(`Erro ao criar cobrança: ${JSON.stringify(err)}`);
    }

    const payment = await paymentRes.json();

    console.log('Cobrança criada:', { id: payment.id, type: billingType, value });

    return new Response(
      JSON.stringify({
        id: payment.id,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode: payment.pixQrCode,
        pixKey: payment.pixKey,
        status: payment.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao criar pagamento' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
