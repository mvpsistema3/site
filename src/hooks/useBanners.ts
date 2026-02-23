import { useQuery } from '@tanstack/react-query';
import { supabasePublic } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface Banner {
  id: string;
  brand_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  position: number;
  active: boolean;
}

/**
 * Fetch active banners for a brand
 * Automatically filters by current brand from context
 */
export function useBanners() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['banners', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabasePublic
        .from('banners')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id) // SEMPRE filtrar por marca
        .order('position', { ascending: true });

      if (error) throw error;
      return data as Banner[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!brand?.id,
  });
}

/**
 * Fetch the main hero banner (first active banner)
 * Automatically filters by current brand from context
 */
export function useHeroBanner() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['banners', 'hero', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const { data, error } = await supabasePublic
        .from('banners')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id) // SEMPRE filtrar por marca
        .order('position', { ascending: true })
        .limit(1);

      if (error) throw error;
      return data?.[0] as Banner | null;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}
