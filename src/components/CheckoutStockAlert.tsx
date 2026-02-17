import React from 'react';
import { AlertTriangle, TrendingDown, ShoppingBag } from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  stock: number;
  quantity: number;
}

interface CheckoutStockAlertProps {
  items: StockItem[];
  onContinue?: () => void;
  onGoBack?: () => void;
}

export function CheckoutStockAlert({ items, onContinue, onGoBack }: CheckoutStockAlertProps) {
  // Filtrar apenas itens com estoque baixo (< 10)
  const lowStockItems = items.filter(item => item.stock < 10 && item.stock > 0);
  const outOfStockItems = items.filter(item => item.stock === 0);
  const insufficientStockItems = items.filter(item => item.stock < item.quantity && item.stock > 0);

  // Se não há problemas de estoque, não mostrar nada
  if (lowStockItems.length === 0 && outOfStockItems.length === 0 && insufficientStockItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">
            ⚠️ Aviso importante sobre o estoque
          </h3>

          {/* Produtos sem estoque */}
          {outOfStockItems.length > 0 && (
            <div className="mb-3">
              <p className="text-red-700 font-medium mb-1">
                Produtos esgotados:
              </p>
              <ul className="space-y-1">
                {outOfStockItems.map(item => (
                  <li key={item.id} className="text-sm text-red-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Produtos com estoque insuficiente */}
          {insufficientStockItems.length > 0 && (
            <div className="mb-3">
              <p className="text-orange-700 font-medium mb-1">
                Quantidade indisponível:
              </p>
              <ul className="space-y-1">
                {insufficientStockItems.map(item => (
                  <li key={item.id} className="text-sm text-orange-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                    {item.name} - Disponível: {item.stock}, Carrinho: {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Produtos com estoque baixo */}
          {lowStockItems.length > 0 && outOfStockItems.length === 0 && insufficientStockItems.length === 0 && (
            <div className="mb-3">
              <p className="text-yellow-700 font-medium mb-1">
                Últimas unidades disponíveis:
              </p>
              <ul className="space-y-1">
                {lowStockItems.map(item => (
                  <li key={item.id} className="text-sm text-yellow-700 flex items-center gap-2">
                    <TrendingDown className="w-3 h-3" />
                    {item.name} - Restam apenas {item.stock} unidades
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            {(outOfStockItems.length > 0 || insufficientStockItems.length > 0) ? (
              <>
                <button
                  onClick={onGoBack}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Voltar ao carrinho
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 italic">
                  Finalize rapidamente para garantir seus produtos!
                </p>
                {onContinue && (
                  <button
                    onClick={onContinue}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                  >
                    Continuar mesmo assim
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}