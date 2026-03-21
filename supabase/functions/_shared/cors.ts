/**
 * Headers CORS para Edge Functions
 * Restringe requisições apenas a domínios autorizados
 */

const ALLOWED_ORIGINS = [
  'https://seshstore.com.br',
  'https://www.seshstore.com.br',
  'https://grupogot.com',
  'https://www.grupogot.com',
  'https://theog.com.br',
  'https://www.theog.com.br',
  'https://dev-site.grupogot.com',
];

/**
 * Retorna headers CORS com origin validada contra whitelist.
 * Se a origin não for permitida, retorna sem Access-Control-Allow-Origin.
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return headers;
}

