import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBrandColors } from '../hooks/useTheme';

interface StickyMobileCTAProps {
  price: number;
  onAddToCart: () => void;
  disabled?: boolean;
  buttonText?: string;
}

export function StickyMobileCTA({
  price,
  onAddToCart,
  disabled = false,
  buttonText = 'ADICIONAR À SACOLA'
}: StickyMobileCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { primaryColor } = useBrandColors();

  useEffect(() => {
    const handleScroll = () => {
      // Mostrar após rolar 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3 safe-area-pb">
            <div className="flex items-center gap-3 max-w-lg mx-auto">
              {/* Preço */}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Preço</span>
                <span className="text-base font-semibold text-gray-900 leading-tight">
                  {formatPrice(price)}
                </span>
              </div>

              {/* Botão CTA */}
              <button
                onClick={onAddToCart}
                disabled={disabled}
                className="flex-1 h-12 px-4 rounded-xl font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: disabled ? '#9ca3af' : primaryColor
                }}
              >
                {buttonText}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
