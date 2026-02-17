import React, { useState } from 'react';
import { ChevronDown, CreditCard } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  pixDiscount?: number; // percentual de desconto PIX (padrão 5%)
  showInstallments?: boolean;
  showPixPrice?: boolean;
  showDropdown?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  pixDiscount = 0.05,
  showInstallments = true,
  showPixPrice = true,
  showDropdown = true,
}) => {
  const { brandConfig } = useBrand();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const maxInstallments = brandConfig?.settings?.maxInstallments || 12;
  const pixPrice = price * (1 - pixDiscount);
  const pixDiscountPercent = Math.round(pixDiscount * 100);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Gera array de parcelas
  const installments = Array.from({ length: maxInstallments }, (_, i) => {
    const n = i + 1;
    return {
      parcelas: n,
      valor: price / n,
      total: price,
    };
  });

  return (
    <div className="space-y-3">
      {/* Preço principal */}
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          {formatCurrency(price)}
        </span>
        {originalPrice && originalPrice > price && (
          <span className="text-base md:text-xl text-gray-400 line-through">
            {formatCurrency(originalPrice)}
          </span>
        )}
      </div>

      {/* Preço PIX */}
      {showPixPrice && (
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">PIX</span>
          </div>
          <div>
            <span className="text-green-700 font-bold text-lg">
              {formatCurrency(pixPrice)}
            </span>
            <span className="text-green-600 text-sm ml-2">
              ({pixDiscountPercent}% de desconto)
            </span>
          </div>
        </div>
      )}

      {/* Parcelamento */}
      {showInstallments && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <CreditCard size={16} />
            <span className="text-sm">
              ou <strong>{maxInstallments}x</strong> de{' '}
              <strong>{formatCurrency(price / maxInstallments)}</strong> sem juros
            </span>
          </div>

          {/* Dropdown de parcelamento */}
          {showDropdown && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
              >
                Ver todas as opções de parcelamento
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <>
                  {/* Overlay para fechar */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDropdownOpen(false)}
                  />

                  {/* Dropdown */}
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 animate-fade-in">
                    <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                      <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                        <CreditCard size={16} />
                        Opções de Parcelamento
                      </h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {installments.map(({ parcelas, valor }) => (
                        <div
                          key={parcelas}
                          className="flex justify-between items-center py-2 px-3 hover:bg-gray-50 rounded text-sm"
                        >
                          <span className="text-gray-600">
                            {parcelas}x sem juros
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t bg-gray-50 rounded-b-lg">
                      <p className="text-xs text-gray-500 text-center">
                        Parcelas sem juros no cartão de crédito
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
