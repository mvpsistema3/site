import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabasePublic, type Product } from '../lib/supabase';
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

      const { data, error } = await supabasePublic
        .from('products')
        .select(`
          *,
          product_images(url, alt_text, position),
          product_variants(id, color, color_hex, size, sku, stock, price, compare_at_price),
          category_products(categories(id, name, slug))
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

      let query = supabasePublic
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

      // Buscar a categoria pelo slug
      const { data: category, error: categoryError } = await supabasePublic
        .from('categories')
        .select('id, parent_id')
        .eq('slug', categorySlug)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (categoryError || !category) return [];

      // Buscar subcategorias filhas (se a categoria for pai)
      const { data: subcategories } = await supabasePublic
        .from('categories')
        .select('id')
        .eq('parent_id', category.id)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true);

      // Incluir a categoria atual + todas as subcategorias
      const categoryIds = [
        category.id,
        ...((subcategories || []).map((s: any) => s.id)),
      ];

      // Buscar produtos de todas as categorias (pai + filhos)
      const { data, error } = await supabasePublic
        .from('category_products')
        .select(`
          position,
          category_id,
          products(
            *,
            product_images(id, url, alt_text, position),
            product_variants(id, color, color_hex, size, sku, stock, active, price, compare_at_price),
            category_products(categories(id, name, slug))
          )
        `)
        .in('category_id', categoryIds)
        .order('position', { ascending: true });

      if (error) throw error;

      // Deduplicar produtos (um produto pode estar em múltiplas subcategorias)
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

      const { data, error } = await supabasePublic
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

      const { data, error } = await supabasePublic
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
 * Fetch suggested products for a given product
 * Uses the product_suggestions table to return only explicitly linked products
 */
export function useProductSuggestions(productId: string) {
  return useQuery({
    queryKey: ['product-suggestions', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabasePublic
        .from('product_suggestions')
        .select(`
          position,
          suggested_product:products!product_suggestions_suggested_product_id_fkey(
            *,
            product_images(url, alt_text, position),
            product_variants(id, color, color_hex, size, sku, stock, price, compare_at_price)
          )
        `)
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.suggested_product)
        .filter((p: any) => p && p.active && !p.deleted_at);
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
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

      const { data, error } = await supabasePublic
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
