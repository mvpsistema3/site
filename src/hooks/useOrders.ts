import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type Order } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';

export interface OrderItemDetail {
  id: string;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  product_image_url: string | null;
}

export interface OrderWithItems {
  id: string;
  brand_id: string;
  user_id: string | null;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cpf: string;
  shipping_address: Record<string, any> | null;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  discount_amount: number;
  total: number;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: string;
  fulfillment_status: string | null;
  payment_method: string | null;
  installments: number | null;
  tracking_code: string | null;
  tracking_url: string | null;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  order_items: OrderItemDetail[];
}

export const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  paid: { label: 'Pago', color: 'text-green-700', bgColor: 'bg-green-100' },
  processing: { label: 'Preparando', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  shipped: { label: 'Enviado', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  delivered: { label: 'Entregue', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100' },
};

/**
 * Create a new order
 * Automatically includes brand_id from context
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { brand } = useBrand();

  return useMutation({
    mutationFn: async (orderData: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'brand_id'>) => {
      if (!brand?.id) {
        throw new Error('Brand não encontrada');
      }

      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...orderData,
          brand_id: brand.id, // Adiciona brand_id automaticamente
        })
        .select()
        .single();

      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

/**
 * Fetch user orders
 * Automatically filters by current brand from context
 */
export function useUserOrders(userId: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['orders', userId, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .eq('brand_id', brand.id) // SEMPRE filtrar por marca
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!userId && !!brand?.id,
  });
}

/**
 * Fetch orders for the current authenticated user with items
 * Used in the "Meus Pedidos" page
 */
export function useMyOrders(statusFilter?: string) {
  const { brand } = useBrand();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-orders', user?.id, brand?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id || !brand?.id) return [];

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id, product_name, variant_name, sku, price, quantity, subtotal, product_image_url
          )
        `)
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OrderWithItems[];
    },
    enabled: !!user?.id && !!brand?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Fetch single order by ID
 * Automatically filters by current brand from context
 */
export function useOrder(orderId: string) {
  const { brand } = useBrand();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['order', orderId, brand?.id],
    queryFn: async () => {
      if (!brand?.id || !user?.id) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id, product_name, variant_name, sku, price, quantity, subtotal, product_image_url
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)
        .single();

      if (error) throw error;
      return data as OrderWithItems;
    },
    enabled: !!orderId && !!brand?.id && !!user?.id,
  });
}

/**
 * Update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data as Order;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.id] });
    },
  });
}
