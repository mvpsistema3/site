import React, { useEffect, useState } from 'react';
import { SEOHead } from '../components/SEOHead';
import { VariantSelector } from '../components/VariantSelector';
import { FeatureFlag } from '../components/FeatureFlag';
import { ProductCard } from '../components/ProductCard';
import { useBrand } from '../contexts/BrandContext';
import { Product } from '../types';

// Exemplo de página de produto integrando os três componentes criados
const ProductPage: React.FC = () => {
  const { brandConfig } = useBrand();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Produto de exemplo
  const product: Product = {
    id: '1',
    name: 'Camiseta Premium Algodão Orgânico',
    price: 89.90,
    originalPrice: 119.90,
    images: [
      '/images/product-1.jpg',
      '/images/product-2.jpg',
      '/images/product-3.jpg',
    ],
    category: 'Camisetas',
    colors: ['black', 'white', 'gray', 'navy'],
    sizes: ['P', 'M', 'G', 'GG'],
    rating: 4.5,
    reviews: 127,
    isNew: true,
    discount: 25,
  };

  // Simulação de estoque por variante
  const variantStock = [
    { color: 'black', size: 'P', stock: 5 },
    { color: 'black', size: 'M', stock: 12 },
    { color: 'black', size: 'G', stock: 3 },
    { color: 'black', size: 'GG', stock: 0 },
    { color: 'white', size: 'P', stock: 8 },
    { color: 'white', size: 'M', stock: 15 },
    { color: 'white', size: 'G', stock: 7 },
    { color: 'white', size: 'GG', stock: 2 },
    { color: 'gray', size: 'P', stock: 0 },
    { color: 'gray', size: 'M', stock: 4 },
    { color: 'gray', size: 'G', stock: 6 },
    { color: 'gray', size: 'GG', stock: 1 },
    { color: 'navy', size: 'P', stock: 10 },
    { color: 'navy', size: 'M', stock: 8 },
    { color: 'navy', size: 'G', stock: 0 },
    { color: 'navy', size: 'GG', stock: 3 },
  ];

  // Produtos relacionados de exemplo
  const relatedProducts: Product[] = [
    {
      id: '2',
      name: 'Calça Jeans Slim',
      price: 199.90,
      originalPrice: 249.90,
      images: ['/images/product-4.jpg'],
      category: 'Calças',
      colors: ['blue', 'black'],
      sizes: ['38', '40', '42', '44'],
      rating: 4.2,
      reviews: 89,
    },
    {
      id: '3',
      name: 'Jaqueta Corta-Vento',
      price: 299.90,
      images: ['/images/product-5.jpg'],
      category: 'Jaquetas',
      colors: ['black', 'navy', 'green'],
      sizes: ['P', 'M', 'G', 'GG'],
      rating: 4.8,
      reviews: 234,
      isNew: true,
    },
  ];

  return (
    <>
      {/* SEO Head com meta tags dinâmicas */}
      <SEOHead
        title={product.name}
        description={`Compre ${product.name} na ${brandConfig.name}. Material premium, conforto garantido. Disponível em várias cores e tamanhos.`}
        keywords={[product.category.toLowerCase(), 'moda masculina', 'roupa premium', product.name.toLowerCase()]}
        image={product.images[0]}
        type="product"
        product={product}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full rounded-lg"
            />
            <div className="grid grid-cols-3 gap-2">
              {product.images.slice(1).map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${product.name} - ${index + 2}`}
                  className="w-full rounded-lg cursor-pointer hover:opacity-80"
                />
              ))}
            </div>
          </div>

          {/* Informações do Produto */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-gray-600">{product.category}</p>
            </div>

            {/* Preço com Feature Flag para parcelamento */}
            <div>
              <div className="flex items-baseline gap-3">
                {product.originalPrice && (
                  <span className="text-2xl text-gray-500 line-through">
                    R$ {product.originalPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-3xl font-bold">
                  R$ {product.price.toFixed(2)}
                </span>
                {product.discount && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                    -{product.discount}%
                  </span>
                )}
              </div>

              {/* Feature Flag: Parcelamento */}
              <FeatureFlag feature="installments">
                <p className="text-sm text-gray-600 mt-2">
                  ou {brandConfig.settings.maxInstallments}x de R${' '}
                  {(product.price / brandConfig.settings.maxInstallments).toFixed(2)} sem juros
                </p>
              </FeatureFlag>
            </div>

            {/* Seletor de Variantes */}
            <VariantSelector
              product={product}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              onColorChange={setSelectedColor}
              onSizeChange={setSelectedSize}
              variantStock={variantStock}
              showStockIndicator={true}
            />

            {/* Botões de Ação */}
            <div className="space-y-3">
              <button
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors
                  ${selectedColor && selectedSize
                    ? `bg-${brandConfig.theme.primaryColor} text-white hover:opacity-90`
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                disabled={!selectedColor || !selectedSize}
              >
                Adicionar ao Carrinho
              </button>

              {/* Feature Flag: Wishlist */}
              <FeatureFlag feature="wishlist">
                <button className="w-full py-3 px-6 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  ♡ Adicionar aos Favoritos
                </button>
              </FeatureFlag>
            </div>

            {/* Feature Flag: Reviews */}
            <FeatureFlag feature="reviews">
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Avaliações</h3>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-gray-600">
                    {product.rating} ({product.reviews} avaliações)
                  </span>
                </div>
              </div>
            </FeatureFlag>

            {/* Feature Flag: Social Sharing */}
            <FeatureFlag feature="socialSharing">
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Compartilhar</h3>
                <div className="flex gap-3">
                  <button className="p-2 bg-blue-600 text-white rounded">Facebook</button>
                  <button className="p-2 bg-green-500 text-white rounded">WhatsApp</button>
                  <button className="p-2 bg-blue-400 text-white rounded">Twitter</button>
                </div>
              </div>
            </FeatureFlag>
          </div>
        </div>

        {/* Produtos Relacionados com Feature Flag */}
        <FeatureFlag feature="productRecommendations">
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Produtos Relacionados</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedProducts.map(relatedProduct => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  onQuickBuy={(p) => console.log('Quick buy:', p)}
                  onAddToWishlist={(p) => console.log('Add to wishlist:', p)}
                  onView={(p) => console.log('View product:', p)}
                />
              ))}
            </div>
          </div>
        </FeatureFlag>
      </div>
    </>
  );
};

export default ProductPage;