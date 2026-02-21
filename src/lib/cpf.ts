/**
 * CPF validation and formatting utilities.
 */

export { formatCPF } from './utils';

/** Remove all non-digit characters from a CPF string. */
export function stripCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Validate a Brazilian CPF number using the standard modulo-11 algorithm.
 * Accepts formatted (123.456.789-01) or digits-only (12345678901).
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = stripCPF(cpf);

  if (cleaned.length !== 11) return false;

  // Reject all-same-digit patterns (e.g. 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}
