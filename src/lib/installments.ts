/**
 * Política de parcelamento no cartão (PRD A1 / S13).
 *
 * Regra de negócio (definida):
 * - 1x a 3x: SEM JUROS — a loja absorve a taxa (cliente paga exatamente o preço P).
 * - 4x a 12x: taxa FIXA repassada ao cliente via grossing-up. O cliente vê o valor já
 *   com a taxa (produto e carrinho) e esse mesmo valor (G) é o enviado ao Asaas.
 *
 * Metodologia (calibrada com o simulador Asaas — MDR primeiro, antecipação sobre o
 * líquido de MDR; mês de 32 dias no prazo médio):
 *     a = TAXA_ANTEC_MES × (N + 1) / 2 × (32 / 30)
 *     G = ( P / (1 - a) + TARIFA_FIXA ) / (1 - MDR(N))
 *
 * Validação: P=100 → 6x R$110,01 · 8x R$112,75 · 12x R$117,36 (bate com a tabela A1).
 *
 * ⚠️ FONTE ÚNICA: estes coeficientes DEVEM espelhar
 *    supabase/functions/_shared/installments.ts (cobrança). Não divergir.
 * TODO(A1): migrar a tabela para config no banco compartilhado quando o ADM expô-la,
 *    e ler daqui + da Edge Function a partir da mesma fonte.
 */

export const INSTALLMENT_CONFIG = {
  /** Tarifa fixa por transação (R$). */
  tarifaFixa: 0.49,
  /** Antecipação ao mês. 1,7% = manual (padrão); usar 0.016 se ativarem antecipação automática. */
  taxaAntecMes: 0.017,
  /** Nº máximo de parcelas cobradas sem juros (loja absorve). */
  semJurosAte: 3,
  /** Data de revisão das taxas promocionais. */
  validoAte: '2026-09-08',
  /** MDR (taxa da bandeira) por faixa de parcelas. */
  mdr(n: number): number {
    if (n <= 3) return 0; // sem juros — irrelevante (loja absorve)
    if (n <= 6) return 0.0249;
    return 0.0299;
  },
} as const;

export interface InstallmentOption {
  parcelas: number;
  /** Valor de cada parcela já com a taxa (para 1x–3x = P/N). */
  valorParcela: number;
  /** Total cobrado do cliente (= valorParcela × N). Para 1x–3x = P. */
  total: number;
  /** true quando a loja absorve a taxa (1x–3x). */
  semJuros: boolean;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const ceil2 = (v: number) => Math.ceil(v * 100) / 100;

/**
 * Grossing-up: total a cobrar do cliente para receber líquido ≈ P em N parcelas.
 * Para N ≤ semJurosAte retorna P (sem juros).
 */
export function grossUp(P: number, n: number): number {
  if (n <= INSTALLMENT_CONFIG.semJurosAte) return P;
  const { tarifaFixa, taxaAntecMes } = INSTALLMENT_CONFIG;
  const a = taxaAntecMes * ((n + 1) / 2) * (32 / 30);
  return (P / (1 - a) + tarifaFixa) / (1 - INSTALLMENT_CONFIG.mdr(n));
}

/**
 * Calcula a parcela cobrada para N parcelas a partir do preço/total P.
 * O TOTAL (G) é arredondado PARA CIMA ao centavo (a loja nunca recebe abaixo de P);
 * é esse total que é enviado ao Asaas (que ajusta o resíduo na última parcela).
 * `valorParcela` é informativo (total / N).
 */
export function calcularParcela(P: number, n: number): InstallmentOption {
  if (n <= INSTALLMENT_CONFIG.semJurosAte) {
    return { parcelas: n, valorParcela: round2(P / n), total: round2(P), semJuros: true };
  }
  const total = ceil2(grossUp(P, n));
  return { parcelas: n, valorParcela: round2(total / n), total, semJuros: false };
}

/** Total a cobrar do cliente para N parcelas (= o que vai ao Asaas). */
export function totalParcelado(P: number, n: number): number {
  return calcularParcela(P, n).total;
}

/** Lista de opções de 1 a `max` parcelas, com o valor já corrigido (4x–12x). */
export function calcularParcelamento(P: number, max = 12): InstallmentOption[] {
  return Array.from({ length: max }, (_, i) => calcularParcela(P, i + 1));
}

/** Maior nº de parcelas SEM juros disponível (para a chamada "até Nx sem juros"). */
export function maxSemJuros(max = 12): number {
  return Math.min(INSTALLMENT_CONFIG.semJurosAte, max);
}
