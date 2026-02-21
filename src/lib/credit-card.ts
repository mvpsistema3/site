/**
 * Credit card utilities: brand detection, Luhn validation, formatting.
 * For UX feedback only — actual card processing is done server-side by Asaas.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'unknown';

const ELO_BINS = [
  '401178', '401179', '431274', '438935', '451416', '457393', '457631', '457632',
  '504175', '506699', '506770', '506771', '506772', '506773', '506774', '506775',
  '506776', '506777', '506778', '509000', '509001', '509002', '509003', '627780',
  '636297', '636368', '636369', '650031', '650032', '650033', '650035', '650036',
  '650037', '650038', '650039', '650040', '650041', '650042', '650043', '650485',
  '650486', '650487', '650488', '650489', '650490', '650491', '650492', '650493',
  '655000', '655001', '655002', '655003', '655004', '655005',
];

/** Detect card brand from the card number (partial OK for live detection). */
export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 1) return 'unknown';

  // Check Elo first (specific BINs)
  const bin6 = digits.substring(0, 6);
  if (ELO_BINS.includes(bin6)) return 'elo';

  // Hipercard
  if (digits.startsWith('606282') || digits.startsWith('3841')) return 'hipercard';

  // Amex: starts with 34 or 37
  if (/^3[47]/.test(digits)) return 'amex';

  // Mastercard: 51-55 or 2221-2720
  if (/^5[1-5]/.test(digits)) return 'mastercard';
  const fourDigit = parseInt(digits.substring(0, 4));
  if (fourDigit >= 2221 && fourDigit <= 2720) return 'mastercard';

  // Visa: starts with 4
  if (digits.startsWith('4')) return 'visa';

  return 'unknown';
}

/** Validate card number using the Luhn algorithm. */
export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let isDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i));
    if (isDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isDouble = !isDouble;
  }

  return sum % 10 === 0;
}

/** Format card number with spaces (4-4-4-4 or 4-6-5 for Amex). */
export function formatCardNumber(number: string): string {
  const digits = number.replace(/\D/g, '');
  const brand = detectCardBrand(digits);

  if (brand === 'amex') {
    // Amex: 4-6-5
    return digits
      .substring(0, 15)
      .replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
        [a, b, c].filter(Boolean).join(' ')
      );
  }

  // Default: groups of 4
  return digits
    .substring(0, 16)
    .replace(/(\d{4})/g, '$1 ')
    .trim();
}

/** Auto-format expiry input to MM/YY. */
export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').substring(0, 4);
  if (digits.length >= 3) {
    return `${digits.substring(0, 2)}/${digits.substring(2)}`;
  }
  return digits;
}

/** Get max card number length for a given brand. */
export function getCardMaxLength(brand: CardBrand): number {
  return brand === 'amex' ? 15 : 16;
}

/** Get CVV length for a given brand. */
export function getCvvLength(brand: CardBrand): number {
  return brand === 'amex' ? 4 : 3;
}
