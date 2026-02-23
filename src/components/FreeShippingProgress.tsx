import React from 'react';
import { Truck } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';

interface FreeShippingProgressProps {
  cartSubtotal: number;
}

/**
 * Componente para mostrar progresso de frete grátis
 * Calcula: threshold - subtotal = remaining
 */
export function FreeShippingProgress({ cartSubtotal }: FreeShippingProgressProps) {
  const { brand } = useBrand();
  const { primaryColor } = useBrandColors();

  const threshold = brand?.settings?.freeShippingThreshold || 0;

  // Não mostra se não tiver frete grátis configurado
  if (!threshold) {
    return null;
  }

  const subtotal = cartSubtotal;

  // Calcula valores para o progresso
  const remaining = Math.max(0, threshold - subtotal);
  const percentage = Math.min(100, (subtotal / threshold) * 100);
  const isEligible = subtotal >= threshold;

  // Converte hex para RGB para criar variações de cor
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 180, b: 189 }; // fallback cyan
  };

  const rgb = hexToRgb(primaryColor);
  const brandColorLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
  const brandColorMedium = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`;

  return (
    <div
      className={`rounded-xl p-5 border-2 transition-all duration-500 ${
        isEligible
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-lg shadow-green-100'
          : 'shadow-md'
      }`}
      style={!isEligible ? {
        background: `linear-gradient(to bottom right, ${brandColorLight}, ${brandColorMedium})`,
        borderColor: `${primaryColor}33`,
        boxShadow: `0 4px 6px -1px ${primaryColor}10`
      } : undefined}
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`p-3 rounded-xl shadow-sm ${isEligible ? 'bg-green-100' : ''}`}
          style={!isEligible ? { backgroundColor: `${primaryColor}15` } : undefined}
        >
          <Truck
            className={`w-6 h-6 ${isEligible ? 'text-green-600' : ''}`}
            style={!isEligible ? { color: primaryColor } : undefined}
            strokeWidth={2}
          />
        </div>
        <div className="flex-1">
          {isEligible ? (
            <div>
              <p className="text-base font-bold text-green-800 mb-1">Parabéns! 🎉</p>
              <p className="text-sm text-green-700 leading-relaxed">
                Você desbloqueou frete grátis neste pedido
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Faltam apenas{' '}
                <span className="font-bold text-lg text-gray-900">
                  R$ {remaining.toFixed(2)}
                </span>
              </p>
              <p className="text-xs text-gray-600">para ganhar frete grátis</p>
            </div>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="relative w-full bg-white/60 rounded-full h-4 overflow-hidden shadow-inner border border-white/50">
        <div
          className={`h-full transition-all duration-700 ease-out relative ${
            isEligible ? 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-500' : ''
          }`}
          style={{
            width: `${percentage}%`,
            background: !isEligible
              ? `linear-gradient(to right, ${primaryColor}, ${primaryColor}dd, ${primaryColor})`
              : undefined
          }}
        >
          {/* Brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          {/* Highlight superior */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
        </div>

        {/* Marcador de meta */}
        {!isEligible && percentage > 10 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-white rounded-full shadow-md animate-pulse" />
          </div>
        )}
      </div>

      {/* Porcentagem e valores */}
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs font-bold text-gray-700">
          R$ {subtotal.toFixed(2)}
        </span>
        <div
          className={`px-3 py-1 rounded-full font-bold text-xs ${
            isEligible ? 'bg-green-100 text-green-700' : ''
          }`}
          style={!isEligible ? {
            backgroundColor: `${primaryColor}15`,
            color: primaryColor
          } : undefined}
        >
          {percentage.toFixed(0)}%
        </div>
        <span className="text-xs font-bold text-gray-700">
          R$ {threshold.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
