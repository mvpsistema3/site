// Supabase Edge Function para cálculo de frete via API Frenet
// Protege o token da API no servidor

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getClientIp, rateLimitResponse } from '../_shared/rate-limit.ts';

/**
 * Interface para o request da aplicação
 */
interface CalculateShippingRequest {
  recipientCEP: string;
  invoiceValue: number;
}

/**
 * Interface para a configuração de frete vinda do banco
 */
interface ShippingConfig {
  seller_cep: string;
  box_height: number;
  box_length: number;
  box_width: number;
  box_weight: number;
}

/**
 * Fallback caso a tabela não esteja acessível
 */
const DEFAULT_CONFIG: ShippingConfig = {
  seller_cep: '24330286',
  box_height: 12,
  box_length: 25,
  box_width: 15,
  box_weight: 0.8,
};

/**
 * Token da API Frenet (protegido no servidor via secrets)
 */
const FRENET_API_TOKEN = Deno.env.get('FRENET_API_TOKEN');

if (!FRENET_API_TOKEN) {
  console.error('FRENET_API_TOKEN não configurado nas secrets da Edge Function');
}

/**
 * Busca configuração de frete da tabela shipping_config
 */
async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('shipping_config')
      .select('seller_cep, box_height, box_length, box_width, box_weight')
      .limit(1)
      .single();

    if (error || !data) {
      console.warn('Erro ao buscar shipping_config, usando fallback:', error?.message);
      return DEFAULT_CONFIG;
    }

    return data as ShippingConfig;
  } catch (err) {
    console.warn('Falha ao acessar shipping_config, usando fallback:', err);
    return DEFAULT_CONFIG;
  }
}

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
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: cors,
    });
  }

  // Rate limit: 30 requisições por minuto por IP
  const clientIp = getClientIp(req);
  const rateCheck = checkRateLimit(clientIp, 30, 60_000);
  if (!rateCheck.allowed) {
    return rateLimitResponse(cors, rateCheck.retryAfterMs);
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido. Use POST.' }),
        {
          status: 405,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validar que o token Frenet está configurado
    if (!FRENET_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Serviço de frete indisponível' }),
        {
          status: 503,
          headers: { ...cors, 'Content-Type': 'application/json' },
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
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    const cleanedCEP = cleanCEP(recipientCEP);
    if (!isValidCEP(cleanedCEP)) {
      return new Response(
        JSON.stringify({ error: 'CEP inválido. O CEP deve ter 8 dígitos.' }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!invoiceValue || invoiceValue <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valor da nota fiscal inválido' }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    // Buscar configuração dinâmica da tabela
    const config = await getShippingConfig();

    // Montar payload para API Frenet
    const frenetPayload = {
      SellerCEP: config.seller_cep,
      RecipientCEP: cleanedCEP,
      ShipmentInvoiceValue: Number(invoiceValue),
      ShippingServiceCode: null,
      ShippingItemArray: [{
        Height: config.box_height,
        Length: config.box_length,
        Width: config.box_width,
        Weight: config.box_weight,
        Quantity: 1,
        SKU: 'CAIXA_PADRAO',
        Category: 'Tabacaria',
      }],
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
      headers: { ...cors, 'Content-Type': 'application/json' },
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
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }
});
