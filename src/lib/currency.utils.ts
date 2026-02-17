/**
 * Utilitários para formatação de moeda
 * Fornece funções para trabalhar com valores monetários em BRL
 */

/**
 * Formata um valor numérico para moeda brasileira
 *
 * @param value - Valor numérico ou string a ser formatado
 * @returns Valor formatado (ex: "R$ 150,00")
 *
 * @example
 * formatCurrency(150) // "R$ 150,00"
 * formatCurrency("31.71") // "R$ 31,71"
 * formatCurrency(0) // "R$ 0,00"
 */
export function formatCurrency(value: number | string): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericValue);
}

/**
 * Converte valor em centavos para reais
 *
 * @param cents - Valor em centavos
 * @returns Valor em reais
 *
 * @example
 * centsToCurrency(15000) // 150.00
 * centsToCurrency(3171) // 31.71
 */
export function centsToCurrency(cents: number): number {
  return cents / 100;
}

/**
 * Converte valor em reais para centavos
 *
 * @param reais - Valor em reais
 * @returns Valor em centavos
 *
 * @example
 * currencyToCents(150.00) // 15000
 * currencyToCents(31.71) // 3171
 */
export function currencyToCents(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Parse de string de moeda para número
 * Remove símbolos e converte vírgula em ponto
 *
 * @param value - String de moeda (ex: "R$ 150,00" ou "150,00")
 * @returns Valor numérico
 *
 * @example
 * parseCurrency("R$ 150,00") // 150
 * parseCurrency("31,71") // 31.71
 * parseCurrency("1.500,00") // 1500
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;

  // Remove R$, espaços e pontos de milhar
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Calcula a porcentagem de desconto
 *
 * @param originalPrice - Preço original
 * @param discountedPrice - Preço com desconto
 * @returns Porcentagem de desconto
 *
 * @example
 * calculateDiscountPercentage(100, 80) // 20
 * calculateDiscountPercentage(150, 120) // 20
 */
export function calculateDiscountPercentage(
  originalPrice: number,
  discountedPrice: number
): number {
  if (originalPrice <= 0) return 0;

  const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
  return Math.round(discount);
}

/**
 * Aplica desconto em porcentagem a um valor
 *
 * @param value - Valor original
 * @param discountPercent - Porcentagem de desconto (0-100)
 * @returns Valor com desconto aplicado
 *
 * @example
 * applyDiscount(100, 20) // 80
 * applyDiscount(150, 10) // 135
 */
export function applyDiscount(value: number, discountPercent: number): number {
  if (discountPercent <= 0) return value;
  if (discountPercent >= 100) return 0;

  const discountAmount = (value * discountPercent) / 100;
  return value - discountAmount;
}

/**
 * Formata valor de desconto com sinal
 *
 * @param discount - Valor do desconto
 * @returns String formatada com sinal negativo
 *
 * @example
 * formatDiscount(20) // "- R$ 20,00"
 * formatDiscount(0) // "R$ 0,00"
 */
export function formatDiscount(discount: number): string {
  if (discount <= 0) return formatCurrency(0);

  return `- ${formatCurrency(discount)}`;
}

/**
 * Valida se um valor é um número válido e positivo
 *
 * @param value - Valor a ser validado
 * @returns true se o valor for válido
 */
export function isValidCurrencyValue(value: number | string): boolean {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(numericValue) && numericValue >= 0;
}
