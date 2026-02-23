/**
 * ShippingCalculator Component
 * Componente completo para cálculo de frete
 * Permite inserir CEP e selecionar opção de entrega
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertCircle, CheckCircle, Info, Truck } from 'lucide-react';
import { ShippingCalculatorProps, FrenetShippingService } from '../types/shipping.types';
import { useShipping } from '../hooks/useShipping';
import { ViaCEPService } from '../lib/viaCep';
import { ShippingOption, ShippingOptionSkeleton } from './ShippingOption';
import { useBrand } from '../contexts/BrandContext';

export function ShippingCalculator({
  cartTotal,
  onShippingSelected,
  className = '',
}: ShippingCalculatorProps) {
  const [cep, setCep] = useState('');
  const [touched, setTouched] = useState(false);
  const { brand } = useBrand();

  const {
    options,
    loading,
    error,
    selectedService,
    hasOptions,
    calculateShipping,
    selectService,
    clearError,
  } = useShipping();

  // Verifica se atinge o threshold de frete grátis
  const freeShippingThreshold = brand?.settings?.freeShippingThreshold || 0;
  const isFreeShipping = freeShippingThreshold > 0 && cartTotal >= freeShippingThreshold;

  // Aplica frete grátis nas opções se atingir o threshold
  const processedOptions = useMemo(() => {
    if (!isFreeShipping) return options;

    return options.map((service) => ({
      ...service,
      ShippingPrice: '0.00',
      OriginalShippingPrice: service.ShippingPrice,
    }));
  }, [options, isFreeShipping]);

  // Validar CEP
  const cleanedCEP = ViaCEPService.formatCEP(cep);
  const isValidCEP = ViaCEPService.validateCEP(cleanedCEP);
  const canCalculate = isValidCEP && cartTotal > 0 && !loading;

  // Handler para calcular frete
  const handleCalculate = async () => {
    if (!canCalculate) return;

    clearError();
    setTouched(true);

    try {
      await calculateShipping({
        destinationCEP: cleanedCEP,
        invoiceValue: cartTotal,
      });
    } catch (err) {
      // Erro já tratado no hook
      console.error('Erro ao calcular frete:', err);
    }
  };

  // Handler para mudança de CEP
  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Permitir apenas números e hífen
    const formatted = value.replace(/[^\d-]/g, '');

    // Auto-formatar com hífen
    let finalValue = formatted;
    if (formatted.length <= 9) {
      const numbers = formatted.replace(/-/g, '');
      if (numbers.length > 5) {
        finalValue = `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
      } else {
        finalValue = numbers;
      }
    }

    setCep(finalValue);
    clearError();
  };

  // Handler de Enter no input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canCalculate) {
      handleCalculate();
    }
  };

  // Handler de seleção de serviço
  const handleSelectService = (service: FrenetShippingService) => {
    // Se frete grátis, passa o serviço com preço zerado
    const serviceToSelect = isFreeShipping
      ? { ...service, ShippingPrice: '0.00' }
      : service;

    selectService(serviceToSelect);
    if (onShippingSelected) {
      onShippingSelected(serviceToSelect);
    }
  };

  // Notificar quando desselecionar
  useEffect(() => {
    if (!selectedService && onShippingSelected) {
      onShippingSelected(null as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Package className="w-5 h-5 text-gray-700" strokeWidth={2} />
        </div>
        <h3 className="text-base font-bold text-gray-900 tracking-tight">Calcular frete</h3>
      </div>

      {/* Input de CEP */}
      <div className="space-y-3">
        <label htmlFor="cep-input" className="block text-sm font-medium text-gray-700">
          CEP de destino
        </label>

        <div className="flex gap-2">
          <input
            id="cep-input"
            type="text"
            value={cep}
            onChange={handleCEPChange}
            onKeyPress={handleKeyPress}
            placeholder="00000-000"
            maxLength={9}
            className={`
              flex-1 px-4 py-3 border rounded-lg text-sm
              focus:outline-none focus:ring-2 transition-all duration-200
              font-medium tracking-wide
              ${
                error && touched
                  ? 'border-red-500 focus:ring-red-500/20 bg-red-50'
                  : 'border-gray-300 focus:ring-sesh-cyan/20 focus:border-sesh-cyan bg-white'
              }
            `}
          />

          <button
            type="button"
            onClick={handleCalculate}
            disabled={!canCalculate}
            className={`
              px-5 py-3 rounded-lg font-bold text-sm
              transition-all duration-200 tracking-wide
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${
                canCalculate
                  ? 'bg-black text-white hover:bg-gray-800 active:scale-95 focus:ring-black/20'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Calcular
          </button>
        </div>

        {/* Link para buscar CEP */}
        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 hover:text-sesh-cyan inline-flex items-center gap-1 transition-colors font-medium"
        >
          <Info size={12} />
          Não sei meu CEP
        </a>

        {/* Validação de CEP */}
        {touched && !isValidCEP && cep.length > 0 && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">CEP inválido. Digite um CEP com 8 dígitos.</span>
          </div>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-bold mb-1">Erro ao calcular frete</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 text-gray-700 text-sm font-medium">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 animate-pulse" />
            </div>
            <span>Calculando opções de entrega...</span>
          </div>

          {/* Skeletons */}
          <ShippingOptionSkeleton />
          <ShippingOptionSkeleton />
        </div>
      )}

      {/* Opções de frete */}
      {!loading && hasOptions && (
        <div className="space-y-4">
          {/* Banner de frete grátis */}
          {isFreeShipping && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-green-800">Parabéns!</p>
                  <p className="text-sm text-green-700">Você ganhou frete grátis neste pedido</p>
                </div>
              </div>
            </div>
          )}

          {/* Header de resultados */}
          <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>
              {processedOptions.length} {processedOptions.length === 1 ? 'opção disponível' : 'opções disponíveis'}
            </span>
          </div>

          {/* Lista de opções */}
          <div className="space-y-2">
            {processedOptions.map((service) => (
              <ShippingOption
                key={`${service.ServiceCode}-${service.Carrier}`}
                service={service}
                selected={selectedService?.ServiceCode === service.ServiceCode}
                onSelect={() => handleSelectService(service)}
                isFree={isFreeShipping}
              />
            ))}
          </div>

          {/* Informação sobre prazo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-100 rounded-lg">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Os prazos de entrega são calculados em dias úteis (seg-sex) e começam
                a contar após a confirmação do pagamento e postagem do pedido.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nenhuma opção disponível após cálculo */}
      {!loading && touched && !error && !hasOptions && cleanedCEP.length === 8 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">
                Nenhuma opção disponível
              </p>
              <p className="text-sm text-yellow-700 mt-0.5">
                Não encontramos opções de entrega para este CEP. Verifique se o CEP está correto ou
                entre em contato conosco.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
