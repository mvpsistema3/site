import { ChevronDown } from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { useBrandColors } from '../../hooks/useTheme';
import { formatCurrency } from '../../lib/currency.utils';
import { calcularParcelamento } from '../../lib/installments';

interface InstallmentSelectorProps {
  totalAmount: number;
  selected: number;
  onSelect: (installments: number) => void;
}

export function InstallmentSelector({
  totalAmount,
  selected,
  onSelect,
}: InstallmentSelectorProps) {
  const { brandConfig } = useBrand();
  const { primaryColor } = useBrandColors();
  const maxInstallments = brandConfig?.settings?.maxInstallments || 12;

  // Parcelamento real (S13/A1): 1x–3x sem juros, 4x–12x com taxa fixa repassada
  const options = calcularParcelamento(totalAmount, maxInstallments).map((opt) => ({
    count: opt.parcelas,
    label:
      opt.parcelas === 1
        ? `1x de ${formatCurrency(opt.total)} (à vista)`
        : opt.semJuros
          ? `${opt.parcelas}x de ${formatCurrency(opt.valorParcela)} sem juros`
          : `${opt.parcelas}x de ${formatCurrency(opt.valorParcela)} — total ${formatCurrency(opt.total)}`,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Parcelas</label>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2 pr-10"
          style={{ '--tw-ring-color': `${primaryColor}30` } as any}
        >
          {options.map((opt) => (
            <option key={opt.count} value={opt.count}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
