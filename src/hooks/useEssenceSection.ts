import { useQuery } from '@tanstack/react-query';
import { supabasePublic } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface EssenceSection {
  id: string;
  brand_id: string;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_page_id: string | null;
  active: boolean;
}

export function useEssenceSection() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['essence-section', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const { data, error } = await supabasePublic
        .from('essence_section')
        .select('id, brand_id, title, subtitle, description, button_text, button_page_id, active')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .single();

      if (error) throw error;
      return data as EssenceSection;
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!brand?.id,
  });
}
