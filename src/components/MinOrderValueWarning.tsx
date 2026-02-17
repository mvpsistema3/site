import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import { useCartStore } from '../stores/cartStore';

/**
 * Componente para mostrar aviso de valor mínimo do pedido
 */
export function MinOrderValueWarning() {
  const { brandConfig } = useBrand();
  const { cartTotal, isMinOrderValueMet } = useCartStore();

  const minOrderValue = brandConfig.settings.minOrderValue || 0;

  // Não mostra se não tiver valor mínimo configurado
  if (!minOrderValue) {
    return null;
  }

  // Não mostra se o valor mínimo já foi atingido
  if (isMinOrderValueMet(minOrderValue)) {
    return null;
  }

  const remaining = minOrderValue - cartTotal;

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800">
            Valor mínimo do pedido não atingido
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Adicione mais <strong>R$ {remaining.toFixed(2)}</strong> para finalizar seu pedido.
            O valor mínimo é de <strong>R$ {minOrderValue.toFixed(2)}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
