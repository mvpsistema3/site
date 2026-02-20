import React from 'react';
import { Product } from '../types';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { FeatureFlag } from './FeatureFlag';
import { Heart, ShoppingBag, Star, Eye } from 'lucide-react';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useIsFavorite, useToggleFavorite } from '../hooks/useFavorites';

interface ProductCardProps {
  product: Product;
  onQuickBuy?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  onView?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickBuy,
  onAddToWishlist,
  onView,
}) => {
  const { brandConfig } = useBrand();
  const { features } = useFeatureFlag();
  const { user } = useAuth();
  const isFavorite = useIsFavorite(product.id);
  const { mutate: toggleFavorite } = useToggleFavorite();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const calculateDiscount = () => {
    if (product.originalPrice && product.originalPrice > product.price) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  };

  const discount = calculateDiscount();

  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
      {/* Badge de Desconto */}
      {discount > 0 && (
        <div className="absolute top-2 left-2 z-10">
          <span className="bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">
            -{discount}%
          </span>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        {/* Wishlist - Feature Flag */}
        <FeatureFlag feature="wishlist">
          <button
            onClick={() => {
              if (!user) {
                window.dispatchEvent(new CustomEvent('open-login-modal'));
                return;
              }
              toggleFavorite(product.id);
              onAddToWishlist?.(product);
            }}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
            title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart className={`w-4 h-4 transition-colors duration-200 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </FeatureFlag>

        {/* Quick Buy - Feature Flag */}
        <FeatureFlag feature="quickBuy">
          <button
            onClick={() => onQuickBuy?.(product)}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
            title="Compra rápida"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </FeatureFlag>
      </div>

      {/* Imagem do Produto */}
      <div className="aspect-square overflow-hidden rounded-t-lg cursor-pointer" onClick={() => onView?.(product)}>
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Informações do Produto */}
      <div className="p-4">
        {/* Categoria */}
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {product.category}
        </p>

        {/* Nome do Produto */}
        <h3
          className="text-base font-medium text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-gray-700 transition-colors"
          onClick={() => onView?.(product)}
        >
          {product.name}
        </h3>

        {/* Reviews - Feature Flag */}
        <FeatureFlag feature="reviews">
          {product.rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">({product.reviews})</span>
            </div>
          )}
        </FeatureFlag>

        {/* Cores Disponíveis */}
        {product.colors.length > 0 && (
          <div className="flex gap-1 mb-2">
            {product.colors.slice(0, 5).map((color) => (
              <div
                key={color}
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-xs text-gray-500">+{product.colors.length - 5}</span>
            )}
          </div>
        )}

        {/* Preços */}
        <div className="flex items-baseline gap-2">
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(product.price)}
          </span>
        </div>

        {/* Parcelamento - Feature Flag */}
        <FeatureFlag feature="installments">
          {brandConfig.settings.maxInstallments > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              até {brandConfig.settings.maxInstallments}x de{' '}
              {formatPrice(product.price / brandConfig.settings.maxInstallments)}
            </p>
          )}
        </FeatureFlag>

        {/* Recently Viewed Indicator - Feature Flag */}
        <FeatureFlag feature="recentlyViewed">
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <Eye className="w-3 h-3 mr-1" />
            <span>Visto recentemente</span>
          </div>
        </FeatureFlag>
      </div>
    </div>
  );
};