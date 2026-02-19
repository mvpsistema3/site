import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface Collection {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  redirect_url: string | null;
  button_text: string | null;
  show_button: boolean;
  position: number;
  featured: boolean;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
}

/**
 * Busca a coleção ativa principal para o hero banner da homepage
 * Retorna a primeira coleção ativa ordenada por position
 */
export function useHeroCollection() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['collections', 'hero', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('position', { ascending: true })
        .limit(1);

      if (error) throw error;
      return data?.[0] as Collection | null;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Busca todas as coleções ativas de uma marca
 */
export function useActiveCollections() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['collections', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as Collection[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Busca produtos de uma coleção pelo slug
 * Usa a junction table product_collections
 */
export function useProductsByCollectionSlug(collectionSlug: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'collection-slug', collectionSlug, brand?.id],
    queryFn: async () => {
      if (!brand?.id || !collectionSlug) return [];

      // Buscar a coleção pelo slug
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('id')
        .eq('slug', collectionSlug)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (collectionError || !collection) return [];

      // Buscar produtos da coleção via junction table
      const { data, error } = await supabase
        .from('product_collections')
        .select(`
          position,
          products(
            *,
            product_images(id, url, alt_text, position),
            product_variants(id, color, color_hex, size, sku, stock, active, price, compare_at_price),
            category_products(categories(id, name, slug))
          )
        `)
        .eq('collection_id', collection.id)
        .order('position', { ascending: true });

      if (error) throw error;

      // Extrair e deduplicar produtos
      const uniqueProducts = new Map<string, any>();
      (data || []).forEach((item: any) => {
        const p = item.products;
        if (p && p.active && !p.deleted_at && !uniqueProducts.has(p.id)) {
          uniqueProducts.set(p.id, p);
        }
      });

      return Array.from(uniqueProducts.values());
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!collectionSlug && !!brand?.id,
  });
}
