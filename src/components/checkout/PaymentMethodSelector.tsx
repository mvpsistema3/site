import { motion } from 'framer-motion';
import { QrCode, CreditCard, Check, Zap } from 'lucide-react';
import { useBrandColors } from '../../hooks/useTheme';
import type { PaymentMethod } from '../../types/checkout.types';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

const METHODS: Array<{
  key: PaymentMethod;
  label: string;
  description: string;
  icon: typeof QrCode;
  badge?: string;
}> = [
  {
    key: 'pix',
    label: 'PIX',
    description: 'Aprovação instantânea',
    icon: QrCode,
    badge: 'Mais rápido',
  },
  {
    key: 'credit_card',
    label: 'Cartão de Crédito',
    description: 'Parcele em até 12x sem juros',
    icon: CreditCard,
  },
];

export function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  const { primaryColor } = useBrandColors();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
      <h2 className="text-lg font-bold uppercase tracking-wide mb-6">Forma de pagamento</h2>
      <div className="space-y-3">
        {METHODS.map((method) => {
          const isSelected = selected === method.key;
          const Icon = method.icon;

          return (
            <motion.button
              key={method.key}
              type="button"
              onClick={() => onSelect(method.key)}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                isSelected ? 'shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              style={
                isSelected
                  ? { borderColor: primaryColor, backgroundColor: `${primaryColor}05` }
                  : undefined
              }
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200"
                    style={
                      isSelected
                        ? { backgroundColor: `${primaryColor}15`, color: primaryColor }
                        : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                    }
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{method.label}</span>
                      {method.badge && (
                        <motion.span
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold uppercase tracking-wide flex items-center gap-1"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Zap size={9} />
                          {method.badge}
                        </motion.span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <Check size={20} style={{ color: primaryColor }} />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
