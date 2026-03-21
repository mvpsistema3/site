/**
 * Simple in-memory rate limiter for Edge Functions.
 * Uses a sliding window approach per IP address.
 *
 * NOTA: Em ambiente de Edge Functions com isolates, o state in-memory
 * pode não persistir entre invocações. Para rate limiting robusto em produção,
 * migrar para Upstash Redis ou tabela Supabase com TTL.
 * Mesmo assim, este rate limiter protege contra rajadas dentro do mesmo isolate.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas periodicamente para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000); // Limpar a cada 60s

/**
 * Verifica se a requisição está dentro do limite.
 * @returns { allowed: true } ou { allowed: false, retryAfterMs }
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const key = ip;

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Nova janela
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Extrai o IP do cliente da requisição.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Resposta 429 Too Many Requests.
 */
export function rateLimitResponse(
  corsHeaders: Record<string, string>,
  retryAfterMs?: number
): Response {
  const retryAfterSec = retryAfterMs ? Math.ceil(retryAfterMs / 1000) : 60;
  return new Response(
    JSON.stringify({ error: "Muitas requisições. Tente novamente em breve." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
