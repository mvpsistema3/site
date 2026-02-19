import React from 'react';
import { useFuzzySearch } from '../hooks/useFuzzySearch';
import { useBrandNavigate } from './BrandLink';
import { useBrandColors } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';

interface SearchPreviewProps {
  searchQuery: string;
  onClose: () => void;
  onSelectProduct: (productId: string) => void;
}

export const SearchPreview: React.FC<SearchPreviewProps> = ({
  searchQuery,
  onClose,
  onSelectProduct,
}) => {
  const { products, isLoading } = useFuzzySearch(searchQuery);
  const navigate = useBrandNavigate();
  const { primaryColor } = useBrandColors();
  const { user } = useAuth();

  // Filtrar produtos de tabaco para usuários não logados e mostrar primeiros 6
  const previewProducts = products
    .filter((p: any) => !p.is_tabaco || user)
    .slice(0, 6);

  if (!searchQuery || searchQuery.trim().length < 2) {
    return null;
  }

  const handleProductClick = (productId: string) => {
    onSelectProduct(productId);
    navigate(`/product/${productId}`);
  };

  return (
    <>
      {/* Overlay escuro */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Dropdown de resultados */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl z-50 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
              style={{ borderColor: primaryColor }}
            />
            <p className="mt-2 text-sm text-gray-500">Buscando...</p>
          </div>
        ) : previewProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum produto encontrado para "{searchQuery}"</p>
          </div>
        ) : (
          <div className="py-2">
            {previewProducts.map((product: any) => {
              // Pegar primeira imagem do produto
              const productImages = product.product_images || [];
              const sortedImages = [...productImages].sort((a: any, b: any) =>
                (a.position || 0) - (b.position || 0)
              );
              const imageUrl = sortedImages[0]?.url || product.images?.[0];

              const price = Number(product.price) || 0;
              const originalPrice = product.original_price ? Number(product.original_price) : null;
              const hasDiscount = originalPrice && originalPrice > price;

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Miniatura do produto */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback se imagem não carregar
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-xs text-center p-2">
                        Sem imagem
                      </div>
                    )}
                  </div>

                  {/* Informações do produto */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color: primaryColor }}>
                        R$ {price.toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">
                          R$ {originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Ver todos os resultados */}
            {products.filter((p: any) => !p.is_tabaco || user).length > 6 && (
              <div className="border-t mt-2 pt-2 px-4 pb-3">
                <button
                  onClick={() => {
                    navigate('/shop');
                    onClose();
                  }}
                  className="w-full text-center text-sm font-medium py-2 rounded transition-colors hover:bg-gray-50"
                  style={{ color: primaryColor }}
                >
                  Ver todos os {products.filter((p: any) => !p.is_tabaco || user).length} resultados →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
