import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase, supabasePublic } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';
import { Coupon, CouponValidationResult } from '../types/coupon';

export function useCoupons() {
  const { brand } = useBrand();

  // Buscar todos os cupons da marca (admin)
  const getCoupons = useQuery({
    queryKey: ['coupons', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabasePublic
        .from('coupons')
        .select('*')
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!brand?.id,
  });

  return getCoupons;
}

export function useValidateCoupon() {
  const { brand } = useBrand();
  const [validationResult, setValidationResult] = useState<CouponValidationResult | null>(null);

  const validateCoupon = async (code: string, cartTotal: number): Promise<CouponValidationResult> => {
    if (!code || !brand?.id) {
      return {
        valid: false,
        message: 'Código inválido',
      };
    }

    try {
      // Buscar cupom no banco
      const { data: coupon, error } = await supabasePublic
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('brand_id', brand.id)
        .eq('active', true)
        .single();

      if (error || !coupon) {
        return {
          valid: false,
          message: 'Cupom não encontrado',
        };
      }

      // Validar data de validade
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

      if (now < validFrom) {
        return {
          valid: false,
          message: 'Cupom ainda não está válido',
        };
      }

      if (validUntil && now > validUntil) {
        return {
          valid: false,
          message: 'Cupom expirado',
        };
      }

      // Validar limite de uso
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return {
          valid: false,
          message: 'Cupom já atingiu o limite de uso',
        };
      }

      // Validar valor mínimo
      if (coupon.minimum_purchase && cartTotal < coupon.minimum_purchase) {
        return {
          valid: false,
          message: `Valor mínimo de R$ ${coupon.minimum_purchase.toFixed(2)} não atingido`,
        };
      }

      // Calcular desconto
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = cartTotal * (coupon.discount_value / 100);
        // Aplicar limite máximo de desconto se houver
        if (coupon.maximum_discount && discount > coupon.maximum_discount) {
          discount = coupon.maximum_discount;
        }
      } else {
        // Desconto fixo
        discount = Math.min(coupon.discount_value, cartTotal);
      }

      const result: CouponValidationResult = {
        valid: true,
        message: `Cupom ${code.toUpperCase()} aplicado!`,
        discount,
        coupon: coupon as Coupon,
      };

      setValidationResult(result);
      return result;

    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      return {
        valid: false,
        message: 'Erro ao validar cupom',
      };
    }
  };

  const clearCoupon = () => {
    setValidationResult(null);
  };

  return {
    validateCoupon,
    validationResult,
    clearCoupon,
  };
}

// Hook para registrar uso do cupom após pagamento confirmado
export function useRegisterCouponUsage() {
  const mutation = useMutation({
    mutationFn: async (couponId: string) => {
      const { error } = await supabase.rpc('increment_coupon_usage', {
        coupon_id: couponId,
      });

      if (error) throw error;
      return true;
    },
  });

  return mutation;
}