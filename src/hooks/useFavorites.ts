import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';

interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  brand_id: string;
  created_at: string;
}

/**
 * Fetch all favorites for the current user in the current brand
 */
export function useFavorites() {
  const { brand } = useBrand();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorites', user?.id, brand?.id],
    queryFn: async () => {
      if (!user?.id || !brand?.id) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select('id, product_id, created_at')
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Pick<Favorite, 'id' | 'product_id' | 'created_at'>[];
    },
    enabled: !!user?.id && !!brand?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Check if a specific product is favorited by the current user
 */
export function useIsFavorite(productId: string) {
  const { data: favorites } = useFavorites();
  return favorites?.some((f) => f.product_id === productId) ?? false;
}

/**
 * Get the count of favorites for the current user
 */
export function useFavoritesCount() {
  const { data: favorites } = useFavorites();
  return favorites?.length ?? 0;
}

/**
 * Toggle favorite status for a product (add or remove)
 * Uses optimistic updates for instant UI feedback
 */
export function useToggleFavorite() {
  const { brand } = useBrand();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id || !brand?.id) throw new Error('Usuário não autenticado');

      // Check if already favorited
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'removed' as const, productId };
      } else {
        // Add favorite
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId,
            brand_id: brand.id,
          });

        if (error) throw error;
        return { action: 'added' as const, productId };
      }
    },

    // Optimistic update for instant UI feedback
    onMutate: async (productId) => {
      const queryKey = ['favorites', user?.id, brand?.id];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
        if (!old) return old;
        const exists = old.some((f) => f.product_id === productId);
        if (exists) {
          return old.filter((f) => f.product_id !== productId);
        } else {
          return [
            { id: 'optimistic', product_id: productId, created_at: new Date().toISOString() },
            ...old,
          ];
        }
      });

      return { previousFavorites };
    },

    // Rollback on error
    onError: (_err, _productId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          ['favorites', user?.id, brand?.id],
          context.previousFavorites
        );
      }
    },

    // Refetch after success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id, brand?.id] });
    },
  });
}
