import { ChevronDown } from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import { useBrandColors } from '../../hooks/useTheme';
import { formatCurrency } from '../../lib/currency.utils';

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

  const options = Array.from({ length: maxInstallments }, (_, i) => {
    const count = i + 1;
    const value = totalAmount / count;
    return {
      count,
      value,
      label:
        count === 1
          ? `1x de ${formatCurrency(totalAmount)} (à vista)`
          : `${count}x de ${formatCurrency(value)} sem juros`,
    };
  });

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
