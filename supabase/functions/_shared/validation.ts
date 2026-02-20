/**
 * Validation utilities for Edge Functions.
 */

/**
 * Validate a Brazilian CPF number using the standard algorithm.
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");

  if (cleaned.length !== 11) return false;

  // Reject known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Sanitize a string: trim whitespace and remove control characters.
 */
export function sanitize(value: string | undefined | null): string {
  if (!value) return "";
  return value.trim().replace(/[\x00-\x1F\x7F]/g, "");
}

/**
 * Validate that items array is non-empty and each item has required fields.
 */
export function validateItems(
  items: any[]
): { valid: boolean; error?: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: "Carrinho vazio" };
  }

  for (const item of items) {
    if (!item.product_id) {
      return { valid: false, error: "Item sem product_id" };
    }
    if (!item.quantity || item.quantity < 1) {
      return { valid: false, error: `Quantidade inválida para produto ${item.product_id}` };
    }
  }

  return { valid: true };
}

/**
 * Validate payment method is one of the accepted types.
 */
export function validatePaymentMethod(method: string): boolean {
  return ["pix", "credit_card"].includes(method);
}

/**
 * Format a date as YYYY-MM-DD for Asaas API.
 */
export function formatDateForAsaas(date: Date): string {
  return date.toISOString().split("T")[0];
}
