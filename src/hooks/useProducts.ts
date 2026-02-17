import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, type Product } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

/**
 * Fetch all products from Supabase with images and variants
 * Automatically filters by current brand from context
 */
export function useProducts() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, price, compare_at_price)
        `)
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id) // SEMPRE filtrar por marca
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!brand?.id, // Só executa quando tiver brand
  });
}

/**
 * Fetch a single product by ID with images and variants
 * Optionally filters by brand for security
 */
export function useProduct(id: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['product', id, brand?.id],
    queryFn: async () => {
      if (!id) return null;

      let query = supabase
        .from('products')
        .select(`
          *,
          product_images(id, url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, active, price, compare_at_price)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .eq('active', true);

      // Filtrar por marca se disponível (segurança)
      if (brand?.id) {
        query = query.eq('brand_id', brand.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch products by category slug
 * Automatically filters by current brand from context
 */
export function useProductsByCategorySlug(categorySlug: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'category-slug', categorySlug, brand?.id],
    queryFn: async () => {
      if (!brand?.id || !categorySlug) return [];

      // Primeiro buscar a categoria pelo slug
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (categoryError || !category) return [];

      // Buscar produtos da categoria
      const { data, error } = await supabase
        .from('category_products')
        .select(`
          position,
          products(
            *,
            product_images(id, url, alt_text, position),
            product_variants(id, color, color_hex, size, sku, stock, active, price, compare_at_price)
          )
        `)
        .eq('category_id', category.id)
        .order('position', { ascending: true });

      if (error) throw error;

      // Extrair produtos do resultado
      return (data || [])
        .map((item: any) => item.products)
        .filter((p: any) => p && p.active && !p.deleted_at);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!categorySlug && !!brand?.id,
  });
}

/** @deprecated Use useProductsByCategorySlug instead */
export const useProductsByCollection = useProductsByCategorySlug;

/**
 * Fetch products by category
 * Automatically filters by current brand from context
 */
export function useProductsByCategory(category: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'category', category, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .eq('brand_id', brand.id) // SEMPRE filtrar por marca
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!category && !!brand?.id,
  });
}

/**
 * Fetch featured products
 * Automatically filters by current brand from context
 */
export function useFeaturedProducts() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'featured', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, price, compare_at_price)
        `)
        .is('deleted_at', null)
        .eq('featured', true)
        .eq('active', true)
        .eq('brand_id', brand.id) // SEMPRE filtrar por marca
        .limit(8);

      if (error) throw error;
      return data as any[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Search products by name or description
 * Automatically filters by current brand from context
 */
export function useSearchProducts(query: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['products', 'search', query, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('active', true)
        .eq('brand_id', brand.id); // SEMPRE filtrar por marca

      if (error) throw error;
      return data as Product[];
    },
    enabled: query.length > 2 && !!brand?.id,
  });
}
