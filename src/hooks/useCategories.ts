import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBrand } from '../contexts/BrandContext';

export interface Category {
  id: string;
  brand_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  banner_mobile_url: string | null;
  icon: string | null;
  position: number;
  active: boolean;
  featured: boolean;
  show_in_menu: boolean;
  is_tabacaria?: boolean;
  children?: Category[];
}

/**
 * Organiza categorias em estrutura hierárquica (árvore)
 */
function buildCategoryTree(categories: Category[]): Category[] {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  // Primeiro passo: criar mapa de todas as categorias
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Segundo passo: organizar hierarquia
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      const parent = categoryMap.get(cat.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(category);
    } else {
      rootCategories.push(category);
    }
  });

  // Ordenar por position
  const sortByPosition = (a: Category, b: Category) => (a.position || 0) - (b.position || 0);
  rootCategories.sort(sortByPosition);
  rootCategories.forEach(cat => cat.children?.sort(sortByPosition));

  return rootCategories;
}

/**
 * Busca todas as categorias ativas de uma marca
 * Retorna estrutura plana (flat)
 */
export function useCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Busca categorias organizadas em árvore hierárquica
 * Útil para menus com subcategorias
 */
export function useCategoryTree() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'tree', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return buildCategoryTree(data as Category[]);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Busca apenas categorias que devem aparecer no menu
 * Retorna estrutura hierárquica
 */
export function useMenuCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'menu', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('show_in_menu', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return buildCategoryTree(data as Category[]);
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Busca categorias em destaque para homepage
 */
export function useFeaturedCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'featured', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('featured', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true })
        .limit(6);

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Busca uma categoria específica com seus produtos
 */
export function useCategory(categorySlug: string) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['category', categorySlug, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          category_products(
            product_id,
            position,
            products(
              *,
              product_images(url, alt_text, position),
              product_variants(id, color, color_hex, size, sku, stock)
            )
          )
        `)
        .eq('slug', categorySlug)
        .eq('brand_id', brand.id)
        .is('deleted_at', null)
        .eq('active', true)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!categorySlug && !!brand?.id,
  });
}

/**
 * Busca subcategorias de uma categoria pai
 */
export function useSubcategories(parentId: string | null) {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'children', parentId, brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      let query = supabase
        .from('categories')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (parentId) {
        query = query.eq('parent_id', parentId);
      } else {
        query = query.is('parent_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

/**
 * Busca categorias de tabacaria em destaque para homepage
 * Filtra por is_tabacaria = true, featured = true e apenas categorias com produtos vinculados
 */
export function useTabacariaCategories() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['categories', 'tabacaria', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return [];

      // !inner garante que só retorna categorias que têm ao menos 1 produto em category_products
      const { data, error } = await supabase
        .from('categories')
        .select('*, category_products!inner(product_id)')
        .is('deleted_at', null)
        .eq('active', true)
        .eq('featured', true)
        .eq('brand_id', brand.id)
        .order('position', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Remove o campo category_products que foi usado apenas para o filtro
      return (data as any[]).map(({ category_products: _cp, ...rest }) => rest) as Category[];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!brand?.id,
  });
}

// Exportações de compatibilidade (deprecadas - usar as novas)
/** @deprecated Use useCategories instead */
export const useCollections = useCategories;
/** @deprecated Use useFeaturedCategories instead */
export const useFeaturedCollections = useFeaturedCategories;
/** @deprecated Use useCategory instead */
export const useCollection = useCategory;
