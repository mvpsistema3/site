import { useQuery } from '@tanstack/react-query';
import { supabasePublic } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  position: number;
}

/**
 * Fetch FAQs for the current brand
 * Uses select('*') to work whether or not the 'category' column exists yet
 */
export function useFAQs() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['faqs', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabasePublic
        .from('store_faqs')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as FAQ[];
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}

/**
 * Fetch FAQs filtered by category
 * Only works after the 'category' column is added to store_faqs
 */
export function useFAQsByCategory(category: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['faqs', 'category', category, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabasePublic
        .from('store_faqs')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .eq('category', category)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as FAQ[];
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id && !!category,
  });
}

/**
 * Get distinct FAQ categories for the current brand
 */
export function useFAQCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['faqs', 'categories', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabasePublic
        .from('store_faqs')
        .select('*')
        .eq('brand_id', brand.id)
        .eq('active', true);

      if (error) throw error;
      const categories = [...new Set((data || []).map((d: any) => d.category || 'geral'))];
      return categories;
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}
