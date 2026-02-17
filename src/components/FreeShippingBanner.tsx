import React, { useState } from 'react';
import { Truck, X } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Banner premium no topo anunciando frete grátis
 */
export function FreeShippingBanner() {
  const { brandConfig } = useBrand();
  const { primaryColor } = useBrandColors();
  const [isVisible, setIsVisible] = useState(true);

  const threshold = brandConfig?.settings?.freeShippingThreshold || 0;

  // Não mostra se não tiver frete grátis configurado ou se foi fechado
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
          transition={{ duration: 0.3 }}
          className="relative bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-100 overflow-hidden"
        >
          {/* Decorative line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{
              background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`
            }}
          />

          <div className="container mx-auto px-4 py-3 md:py-3.5 flex items-center justify-center gap-3 relative">
            {/* Icon with brand color background */}
            <div
              className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Truck
                className="w-4 h-4 md:w-5 md:h-5"
                style={{ color: primaryColor }}
                strokeWidth={2.5}
              />
            </div>

            {/* Text */}
            <p className="text-xs md:text-sm text-gray-700 font-medium tracking-wide">
              <span
                className="font-bold uppercase"
                style={{ color: primaryColor }}
              >
                FRETE GRÁTIS
              </span>
              {' '}
              <span className="hidden sm:inline">para compras acima de</span>
              <span className="sm:hidden">acima de</span>
              {' '}
              <span className="font-bold text-gray-900">
                {formatCurrency(threshold)}
              </span>
            </p>

            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute right-3 md:right-4 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
              aria-label="Fechar banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Decorative line bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px opacity-50"
            style={{
              background: `linear-gradient(to right, transparent 20%, ${primaryColor}30 50%, transparent 80%)`
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
