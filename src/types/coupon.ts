export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_purchase?: number;
  maximum_discount?: number; // Para cupons percentuais, limitar o desconto máximo
  usage_limit?: number;
  usage_count: number;
  valid_from: Date;
  valid_until?: Date;
  active: boolean;
  brand_id?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CouponValidationResult {
  valid: boolean;
  message?: string;
  discount?: number;
  coupon?: Coupon;
}