import React, { useState } from 'react';
import { Truck, X } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';

export function FreeShippingBanner() {
  const { brandConfig } = useBrand();
  const { primaryColor } = useBrandColors();
  const [isVisible, setIsVisible] = useState(true);

  const threshold = brandConfig?.settings?.freeShippingThreshold || 0;

  if (!threshold || !isVisible) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden"
          style={{ backgroundColor: `${primaryColor}08` }}
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 relative">
            <Truck
              size={14}
              strokeWidth={2.5}
              style={{ color: primaryColor }}
              className="flex-shrink-0"
            />
            <p className="text-[11px] md:text-[12px] text-gray-600 font-medium tracking-wide">
              <span style={{ color: primaryColor }} className="font-bold">
                FRETE GRÁTIS
              </span>
              {' '}
              <span className="hidden sm:inline">para compras acima de</span>
              <span className="sm:hidden">acima de</span>
              {' '}
              <span className="font-bold text-gray-800">
                {formatCurrency(threshold)}
              </span>
            </p>

            <button
              onClick={() => setIsVisible(false)}
              className="absolute right-3 md:right-4 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full"
              aria-label="Fechar banner"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
