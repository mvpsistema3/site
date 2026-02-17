import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type Order } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

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
 * Fetch single order by ID
 * Automatically filters by current brand from context
 */
export function useOrder(orderId: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['order', orderId, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('brand_id', brand.id) // SEMPRE filtrar por marca
        .single();

      if (error) throw error;
      return data as Order;
    },
    enabled: !!orderId && !!brand?.id,
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
