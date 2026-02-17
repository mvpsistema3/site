// Supabase Edge Function para cálculo de frete via API Frenet
// Protege o token da API no servidor

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Interface para o request da aplicação
 */
interface CalculateShippingRequest {
  recipientCEP: string;
  invoiceValue: number;
}

/**
 * Dimensões fixas da caixa padrão
 */
const STANDARD_BOX = {
  Height: 12,
  Length: 25,
  Width: 15,
  Weight: 0.8,
  Quantity: 1,
  SKU: 'CAIXA_PADRAO',
  Category: 'Tabacaria',
};

/**
 * CEP de origem fixo (Niterói - RJ)
 */
const SELLER_CEP = '24330286';

/**
 * Token da API Frenet (protegido no servidor)
 */
const FRENET_API_TOKEN = Deno.env.get('FRENET_API_TOKEN') || '8637DDEBREA99R4DDBR92E3R5D823268204F';

/**
 * URL da API Frenet
 */
const FRENET_API_URL = 'https://api.frenet.com.br/shipping/quote';

/**
 * Limpa o CEP removendo caracteres não numéricos
 */
function cleanCEP(cep: string): string {
  return cep.replace(/\D/g, '');
}

/**
 * Valida se o CEP tem formato correto (8 dígitos)
 */
function isValidCEP(cep: string): boolean {
  const cleaned = cleanCEP(cep);
  return /^[0-9]{8}$/.test(cleaned);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse do body
    const body: CalculateShippingRequest = await req.json();
    const { recipientCEP, invoiceValue } = body;

    // Validações
    if (!recipientCEP) {
      return new Response(
        JSON.stringify({ error: 'CEP de destino é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const cleanedCEP = cleanCEP(recipientCEP);
    if (!isValidCEP(cleanedCEP)) {
      return new Response(
        JSON.stringify({ error: 'CEP inválido. O CEP deve ter 8 dígitos.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!invoiceValue || invoiceValue <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valor da nota fiscal inválido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Montar payload para API Frenet
    const frenetPayload = {
      SellerCEP: SELLER_CEP,
      RecipientCEP: cleanedCEP,
      ShipmentInvoiceValue: Number(invoiceValue),
      ShippingServiceCode: null,
      ShippingItemArray: [STANDARD_BOX],
      RecipientCountry: 'BR',
    };

    console.log('Calculando frete:', {
      destino: cleanedCEP,
      valor: invoiceValue,
    });

    // Chamar API Frenet com retry
    let response;
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        response = await fetch(FRENET_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'token': FRENET_API_TOKEN,
          },
          body: JSON.stringify(frenetPayload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (response.ok) {
          break; // Sucesso, sair do loop
        }

        attempt++;
        if (attempt < maxAttempts) {
          console.log(`Tentativa ${attempt} falhou, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
        }
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw error;
        }
        console.log(`Tentativa ${attempt} com erro, tentando novamente...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      }
    }

    if (!response || !response.ok) {
      throw new Error(`Erro na API Frenet: ${response?.status || 'timeout'}`);
    }

    const data = await response.json();

    console.log('Frete calculado com sucesso:', {
      opcoes: data.ShippingSevicesArray?.length || 0,
    });

    // Retornar resposta
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao calcular frete:', error);

    let errorMessage = 'Erro ao calcular frete';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Timeout ao calcular frete. Tente novamente.';
        statusCode = 504;
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Dados inválidos na requisição';
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
