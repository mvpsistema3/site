/**
 * CheckoutExample
 * Exemplo de página de checkout usando o ShippingCalculator
 *
 * Este arquivo demonstra como integrar o cálculo de frete
 * no fluxo de checkout da aplicação.
 */

import React, { useState } from 'react';
import { ShippingCalculator } from '../components/ShippingCalculator';
import { useCartStore } from '../stores/cartStore';
import { formatCurrency } from '../lib/currency.utils';
import { CreditCard, Truck, Package, CheckCircle } from 'lucide-react';

export function CheckoutExample() {
  const {
    cart,
    cartSubtotal,
    discountAmount,
    cartTotal,
    shipping,
    shippingCost,
    finalTotal,
    setShipping,
    coupon,
  } = useCartStore();

  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');

  // Handler quando o usuário seleciona uma opção de frete
  const handleShippingSelected = (service: any) => {
    setShipping(service);
    console.log('Frete selecionado:', {
      servico: service.ServiceDescription,
      preco: service.ShippingPrice,
      prazo: service.DeliveryTime,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Pedido</h1>
          <p className="mt-2 text-gray-600">
            Complete as informações abaixo para finalizar sua compra
          </p>
        </div>

        {/* Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {/* Step 1: Frete */}
            <div
              className={`flex items-center ${
                step === 'shipping' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === 'shipping'
                    ? 'border-blue-600 bg-blue-50'
                    : shipping
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-300'
                }`}
              >
                {shipping ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Truck className="w-5 h-5" />
                )}
              </div>
              <span className="ml-2 font-medium">Entrega</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300" />

            {/* Step 2: Pagamento */}
            <div
              className={`flex items-center ${
                step === 'payment' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === 'payment'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="ml-2 font-medium">Pagamento</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300" />

            {/* Step 3: Revisão */}
            <div
              className={`flex items-center ${
                step === 'review' ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === 'review'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <Package className="w-5 h-5" />
              </div>
              <span className="ml-2 font-medium">Revisão</span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Shipping Calculator */}
            {step === 'shipping' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <ShippingCalculator
                  cartTotal={cartTotal}
                  onShippingSelected={handleShippingSelected}
                />

                {/* Continue Button */}
                {shipping && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setStep('payment')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Continuar para Pagamento
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Payment (placeholder) */}
            {step === 'payment' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Forma de Pagamento</h2>
                <p className="text-gray-600">
                  Aqui seria implementado o formulário de pagamento (Stripe, Asaas, etc)
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep('shipping')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep('review')}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Revisar Pedido
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review (placeholder) */}
            {step === 'review' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Revisar Pedido</h2>
                <p className="text-gray-600">
                  Aqui seria exibido o resumo completo do pedido antes da confirmação
                </p>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep('payment')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Voltar
                  </button>
                  <button className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
                    Finalizar Pedido
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Resumo do Pedido</h2>

              {/* Produtos */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
                    className="flex gap-3"
                  >
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.selectedSize} • {item.selectedColor}
                      </p>
                      <p className="text-sm text-gray-700">
                        {item.quantity}x {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(cartSubtotal)}</span>
                </div>

                {/* Desconto */}
                {coupon && discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">
                      Desconto ({coupon.code})
                    </span>
                    <span className="text-green-600">
                      - {formatCurrency(discountAmount)}
                    </span>
                  </div>
                )}

                {/* Total Produtos */}
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700">Total Produtos</span>
                  <span className="text-gray-900">{formatCurrency(cartTotal)}</span>
                </div>

                {/* Frete */}
                {shipping ? (
                  <div className="flex justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-gray-600">
                        Frete ({shipping.ServiceDescription})
                      </span>
                      <span className="text-xs text-gray-500">
                        {shipping.DeliveryTime} dias úteis
                      </span>
                    </div>
                    <span className="text-gray-900">{formatCurrency(shippingCost)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frete</span>
                    <span className="text-gray-500">Calcular</span>
                  </div>
                )}
              </div>

              {/* Total Final */}
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>

                {shipping && (
                  <p className="text-xs text-gray-500 mt-2">
                    Prazo de entrega: {shipping.DeliveryTime} dias úteis após aprovação do
                    pagamento
                  </p>
                )}
              </div>

              {/* Warning se não tiver frete */}
              {!shipping && step !== 'shipping' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Você ainda não selecionou uma opção de frete.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
