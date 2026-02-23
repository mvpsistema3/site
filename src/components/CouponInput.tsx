import React, { useState } from 'react';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { useValidateCoupon } from '../hooks/useCoupons';
import { useCartStore } from '../stores/cartStore';

interface CouponInputProps {
  cartTotal: number;
  onCouponApplied?: (discount: number, couponCode: string) => void;
  onCouponRemoved?: () => void;
}

export function CouponInput({ cartTotal, onCouponApplied, onCouponRemoved }: CouponInputProps) {
  const appliedCoupon = useCartStore((s) => s.coupon);
  const [code, setCode] = useState(appliedCoupon?.code || '');
  const [isValidating, setIsValidating] = useState(false);
  const { validateCoupon, validationResult, clearCoupon } = useValidateCoupon();
  const [error, setError] = useState<string | null>(null);

  // Cupom está ativo se acabou de ser validado OU se já existia no cartStore
  const isApplied = !!(validationResult?.valid || appliedCoupon);
  const displayCode = validationResult?.valid ? code.toUpperCase() : (appliedCoupon?.code || '');
  const displayDiscount = validationResult?.discount || appliedCoupon?.discount || 0;
  const displayDescription = validationResult?.coupon?.description || null;

  const handleApplyCoupon = async () => {
    if (!code.trim()) {
      setError('Digite um código de cupom');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await validateCoupon(code.trim(), cartTotal);

      if (result.valid) {
        if (onCouponApplied && result.discount) {
          onCouponApplied(result.discount, code.trim().toUpperCase());
        }
      } else {
        setError(result.message || 'Cupom inválido');
      }
    } catch (err) {
      setError('Erro ao validar cupom');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCode('');
    setError(null);
    clearCoupon();
    if (onCouponRemoved) {
      onCouponRemoved();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Tag className="w-5 h-5 text-gray-700" strokeWidth={2} />
        </div>
        <h3 className="text-base font-bold text-gray-900 tracking-tight">Cupom de desconto</h3>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={isApplied ? displayCode : code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Digite seu cupom"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sesh-cyan/20 focus:border-sesh-cyan uppercase text-sm font-bold tracking-widest transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-500"
            disabled={isApplied || isValidating}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isApplied) {
                handleApplyCoupon();
              }
            }}
          />
        </div>

        {!isApplied ? (
          <button
            onClick={handleApplyCoupon}
            disabled={isValidating || !code.trim()}
            className="px-5 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-sm tracking-wide active:scale-95"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validando
              </>
            ) : (
              'Aplicar'
            )}
          </button>
        ) : (
          <button
            onClick={handleRemoveCoupon}
            className="px-5 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center gap-2 font-bold text-sm tracking-wide active:scale-95"
          >
            <X className="w-4 h-4" />
            Remover
          </button>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          <X className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Mensagem de sucesso */}
      {isApplied && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <p className="text-green-800 font-bold mb-1">
                Cupom aplicado!
              </p>
              <p className="text-green-700 text-sm mb-2 leading-relaxed">
                {displayDescription || `Código: ${displayCode}`}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-700">Você economizou:</span>
                <span className="text-green-800 font-bold text-lg">
                  {formatCurrency(displayDiscount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}