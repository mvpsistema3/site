import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface StockWarningProps {
  stock: number;
  threshold?: number;
  className?: string;
}

/**
 * Componente para mostrar avisos de estoque baixo
 * @param stock - Quantidade em estoque
 * @param threshold - Limite para considerar estoque baixo (padrão: 10)
 */
export function StockWarning({ stock, threshold = 10, className = '' }: StockWarningProps) {
  if (stock <= 0) {
    return (
      <div className={`flex items-center gap-2 text-red-600 text-sm ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        <span className="font-semibold">Produto esgotado</span>
      </div>
    );
  }

  if (stock <= threshold) {
    return (
      <div className={`flex items-center gap-2 text-orange-600 text-sm ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        <span>
          Restam apenas <strong>{stock}</strong> {stock === 1 ? 'unidade' : 'unidades'}!
        </span>
      </div>
    );
  }

  return null;
}
