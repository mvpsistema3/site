import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Trash2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';
import { useToggleFavorite } from '../hooks/useFavorites';
import { useToastStore } from '../stores/toastStore';
import { useBrandNavigate } from '../components/BrandLink';
import { AccountLayout } from '../components/AccountLayout';

// ─── Types ──────────────────────────────────────────────

interface FavoriteWithProduct {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    price: number;
    compare_at_price: number | null;
    category: string | null;
    active: boolean;
    product_images: { url: string; position: number }[];
  } | null;
}

// ─── Hook ───────────────────────────────────────────────

function useFavoritesWithProducts() {
  const { user } = useAuth();
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['favorites-with-products', user?.id, brand?.id],
    queryFn: async () => {
      if (!user?.id || !brand?.id) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          product_id,
          created_at,
          product:products!inner(
            id, name, price, compare_at_price, category, active,
            product_images(url, position)
          )
        `)
        .eq('user_id', user.id)
        .eq('brand_id', brand.id)
        .eq('product.brand_id', brand.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Supabase returns joined relations - normalize product from array to single object
      return ((data || []) as any[]).map((row) => ({
        ...row,
        product: Array.isArray(row.product) ? row.product[0] ?? null : row.product,
      })) as FavoriteWithProduct[];
    },
    enabled: !!user?.id && !!brand?.id,
    staleTime: 1000 * 60 * 2,
  });
}

// ─── Helpers ────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ─── Skeleton ───────────────────────────────────────────

function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
          <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ─── Product Card (Favorites version) ───────────────────

function FavoriteProductCard({
  favorite,
  primaryColor,
}: {
  favorite: FavoriteWithProduct;
  primaryColor: string;
}) {
  const navigate = useBrandNavigate();
  const { mutate: toggleFavorite, isPending } = useToggleFavorite();
  const addToast = useToastStore((s) => s.addToast);

  const product = favorite.product;
  if (!product || !product.active) {
    return null;
  }

  const images = product.product_images
    ?.sort((a, b) => a.position - b.position)
    .map((img) => img.url) || [];

  const price = Number(product.price);
  const compareAt = product.compare_at_price ? Number(product.compare_at_price) : null;
  const discount = compareAt && compareAt > price
    ? Math.round((1 - price / compareAt) * 100)
    : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="group relative"
    >
      {/* Image */}
      <div
        className="relative aspect-square overflow-hidden bg-gray-50 rounded-lg shadow-sm group-hover:shadow-lg transition-shadow duration-300 cursor-pointer"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <img
          src={images[0] || ''}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Discount badge */}
        {discount > 0 && (
          <span
            className="absolute top-3 left-3 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            {discount}% OFF
          </span>
        )}

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id, {
              onSuccess: () => addToast('Removido dos favoritos', 'info'),
            });
          }}
          disabled={isPending}
          className="absolute top-3 right-3 p-2 bg-white/95 backdrop-blur-sm rounded-full shadow-md transition-all duration-200 hover:scale-110 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Remover dos favoritos"
        >
          {isPending ? (
            <Loader2 size={18} className="animate-spin text-gray-400" />
          ) : (
            <Heart size={18} className="fill-red-500 text-red-500" />
          )}
        </button>
      </div>

      {/* Info */}
      <div
        className="mt-3 cursor-pointer"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        {product.category && (
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">
            {product.category}
          </p>
        )}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:underline decoration-1 underline-offset-2">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(price)}
          </span>
          {compareAt && compareAt > price && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(compareAt)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export function FavoritesPage() {
  const { primaryColor } = useBrandColors();
  const navigate = useBrandNavigate();
  const { data: favorites, isLoading } = useFavoritesWithProducts();

  const activeFavorites = favorites?.filter((f) => f.product && f.product.active) || [];

  const subtitle = isLoading
    ? 'Carregando...'
    : activeFavorites.length === 0
      ? 'Nenhum produto favoritado'
      : `${activeFavorites.length} ${activeFavorites.length === 1 ? 'produto' : 'produtos'}`;

  return (
    <AccountLayout title="Favoritos" subtitle={subtitle} icon={Heart}>
      <div>
        {isLoading ? (
          <FavoritesSkeleton />
        ) : activeFavorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <Heart size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Nenhum favorito ainda
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm">
              Explore nossos produtos e toque no coração para salvar os que mais gostar.
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag size={18} />
              Explorar Produtos
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5"
          >
            {activeFavorites.map((fav) => (
              <FavoriteProductCard
                key={fav.id}
                favorite={fav}
                primaryColor={primaryColor}
              />
            ))}
          </motion.div>
        )}
      </div>
    </AccountLayout>
  );
}
