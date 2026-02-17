import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface FooterLink {
  id: string;
  group_name: string;
  label: string;
  url: string | null;
  icon: string | null;
  is_external: boolean;
  position: number;
}

/**
 * Fetch all active footer links for the current brand
 */
export function useFooterLinks() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['footer-links', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('footer_links')
        .select('id, group_name, label, url, icon, is_external, position')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as FooterLink[];
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}

/**
 * Fetch footer links grouped by group_name
 * Returns: { institucional: FooterLink[], ajuda: FooterLink[], ... }
 */
export function useGroupedFooterLinks() {
  const query = useFooterLinks();

  const grouped = (query.data || []).reduce<Record<string, FooterLink[]>>((acc, link) => {
    if (!acc[link.group_name]) acc[link.group_name] = [];
    acc[link.group_name].push(link);
    return acc;
  }, {});

  return { ...query, data: grouped };
}
