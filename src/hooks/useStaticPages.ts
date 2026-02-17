import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  position: number;
}

/**
 * Fetch a single static page by slug for the current brand
 */
export function useStaticPage(slug: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['static-page', slug, brand?.id],
    queryFn: async () => {
      if (!brand?.id || !slug) return null;

      const { data, error } = await supabase
        .from('static_pages')
        .select('id, slug, title, content, meta_title, meta_description, position')
        .eq('brand_id', brand.id)
        .eq('slug', slug)
        .eq('active', true)
        .single();

      if (error) throw error;
      return data as StaticPage;
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id && !!slug,
  });
}

/**
 * Fetch all active static pages for the current brand
 * Useful for generating navigation/sitemaps
 */
export function useStaticPages() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['static-pages', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('static_pages')
        .select('id, slug, title, meta_title, meta_description, position')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as Omit<StaticPage, 'content'>[];
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}
