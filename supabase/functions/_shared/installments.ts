/**
 * Parcelamento no cartão — lado da COBRANÇA (PRD A1 / S13).
 *
 * 1x–3x: sem juros (cobra o total base). 4x–12x: total com taxa fixa repassada (grossing-up).
 *
 *     a = TAXA_ANTEC_MES × (N + 1) / 2 × (32 / 30)
 *     G = ( P / (1 - a) + TARIFA_FIXA ) / (1 - MDR(N))
 *
 * ⚠️ FONTE ÚNICA: estes coeficientes DEVEM espelhar src/lib/installments.ts (exibição).
 *    Não divergir — o valor exibido ao cliente tem que bater com o cobrado.
 * TODO(A1): migrar para config no banco compartilhado quando o ADM expô-la.
 */

const TARIFA_FIXA = 0.49;
const TAXA_ANTEC_MES = 0.017; // manual (1,7%); usar 0.016 se ativarem antecipação automática
const SEM_JUROS_ATE = 3;

function mdr(n: number): number {
  if (n <= SEM_JUROS_ATE) return 0;
  if (n <= 6) return 0.0249;
  return 0.0299;
}

const ceil2 = (v: number) => Math.ceil(v * 100) / 100;
const round2 = (v: number) => Math.round(v * 100) / 100;

function grossUp(P: number, n: number): number {
  if (n <= SEM_JUROS_ATE) return P;
  const a = TAXA_ANTEC_MES * ((n + 1) / 2) * (32 / 30);
  return (P / (1 - a) + TARIFA_FIXA) / (1 - mdr(n));
}

/**
 * Total a cobrar do cliente para `n` parcelas no cartão, a partir do total base.
 * Para n ≤ 3 retorna o total base (sem juros). Arredonda PARA CIMA ao centavo.
 */
export function chargeTotalForInstallments(baseTotal: number, n: number): number {
  if (n <= SEM_JUROS_ATE) return round2(baseTotal);
  return ceil2(grossUp(baseTotal, n));
}
