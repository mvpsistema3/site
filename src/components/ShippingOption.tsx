/**
 * ShippingOption Component
 * Exibe uma opção de frete com preço e prazo
 */

import React from 'react';
import { Package, Truck, Clock, Check } from 'lucide-react';
import { ShippingOptionProps } from '../types/shipping.types';
import { FrenetService } from '../lib/frenet.service';

interface ExtendedShippingOptionProps extends ShippingOptionProps {
  isFree?: boolean;
}

export function ShippingOption({
  service,
  onSelect,
  selected = false,
  className = '',
  isFree = false,
}: ExtendedShippingOptionProps) {
  // Parse de valores
  const price = parseFloat(service.ShippingPrice);
  const deliveryDays = parseInt(service.DeliveryTime, 10);

  // Formatação
  const formattedPrice = FrenetService.formatShippingPrice(price);
  const formattedTime = FrenetService.formatDeliveryTime(deliveryDays);
  const estimatedDate = FrenetService.calculateDeliveryDate(deliveryDays);
  const formattedDate = FrenetService.formatDeliveryDate(estimatedDate);

  // Ícone baseado no tipo de serviço
  const getServiceIcon = () => {
    const serviceDesc = service.ServiceDescription.toUpperCase();

    if (serviceDesc.includes('SEDEX')) {
      return <Truck className="w-5 h-5" />;
    }

    if (serviceDesc.includes('PAC')) {
      return <Package className="w-5 h-5" />;
    }

    return <Package className="w-5 h-5" />;
  };

  // Badge para serviços expressos
  const isExpress = service.ServiceDescription.toUpperCase().includes('SEDEX');

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={`
        relative w-full text-left
        border-2 rounded-lg p-4
        transition-all duration-200
        hover:border-blue-300 hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:cursor-default disabled:hover:border-gray-300 disabled:hover:shadow-none
        ${
          selected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white'
        }
        ${className}
      `}
    >
      {/* Checkbox de seleção */}
      {selected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div
          className={`
          flex-shrink-0 p-2 rounded-lg
          ${selected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
        `}
        >
          {getServiceIcon()}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Header com nome e badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-semibold text-base ${
                selected ? 'text-blue-900' : 'text-gray-900'
              }`}
            >
              {service.ServiceDescription}
            </h3>

            {isExpress && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Expresso
              </span>
            )}
          </div>

          {/* Transportadora */}
          <p className="text-sm text-gray-500 mb-2">{service.Carrier}</p>

          {/* Prazo */}
          <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-1">
            <Clock className="w-4 h-4" />
            <span>
              {formattedTime}
              <span className="text-gray-500 ml-1">{formattedDate}</span>
            </span>
          </div>

          {/* Preço */}
          <div className="mt-2">
            {isFree || price === 0 ? (
              <div className="flex items-center gap-2">
                {(service as any).OriginalShippingPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    {FrenetService.formatShippingPrice(parseFloat((service as any).OriginalShippingPrice))}
                  </span>
                )}
                <span className="text-lg font-bold text-green-600">
                  GRÁTIS
                </span>
              </div>
            ) : (
              <span
                className={`text-lg font-bold ${
                  selected ? 'text-blue-600' : 'text-gray-900'
                }`}
              >
                {formattedPrice}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mensagem adicional (se houver) */}
      {service.Msg && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">{service.Msg}</p>
        </div>
      )}
    </button>
  );
}

/**
 * Componente de loading/skeleton para ShippingOption
 */
export function ShippingOptionSkeleton() {
  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0" />

        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-24 mt-2" />
        </div>
      </div>
    </div>
  );
}
