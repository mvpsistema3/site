import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Category } from '../hooks/useCategories';
import { useProductsByCategorySlug } from '../hooks/useProducts';
import { useBrandColors } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { BrandLink } from './BrandLink';
import { ProductCard } from './ProductCard';
import { Product } from '../types';

/**
 * Normaliza produto do banco para formato esperado pelo ProductCard
 */
function normalizeProduct(product: any) {
  if (!product) return null;

  // Extrair URLs das imagens
  const images = product.product_images
    ? product.product_images
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
        .map((img: any) => img.url)
    : product.images || [];

  // Extrair cores das variantes
  const colors = product.product_variants
    ? [...new Set(product.product_variants.map((v: any) => v.color_hex || v.color).filter(Boolean))]
    : product.colors || [];

  // Extrair tamanhos das variantes
  const sizes = product.product_variants
    ? [...new Set(product.product_variants.map((v: any) => v.size).filter(Boolean))]
    : product.sizes || [];

  // Calcular estoque total
  const stock = product.product_variants
    ? product.product_variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
    : product.stock || 0;

  return {
    ...product,
    images,
    colors,
    sizes,
    stock,
    // Compatibilidade com campos esperados
    originalPrice: product.compare_at_price || product.original_price,
    rating: product.rating || 0,
    reviews: product.reviews || 0,
  };
}

interface ProductSectionWithTabsProps {
  title: string;
  highlightedWord?: string;
  categories: Category[];
  defaultCategorySlug?: string;
  showAllOption?: boolean;
  maxProducts?: number;
  sectionId?: string;
  bgColor?: string;
}

/**
 * Seção de produtos com tabs de categoria para filtro inline
 * Estilo inspirado na aLeda - sem navegação de página
 */
export function ProductSectionWithTabs({
  title,
  highlightedWord,
  categories,
  defaultCategorySlug,
  showAllOption = true,
  maxProducts = 4,
  sectionId,
  bgColor = 'transparent',
}: ProductSectionWithTabsProps) {
  const { primaryColor } = useBrandColors();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(
    defaultCategorySlug || (categories.length > 0 ? categories[0]?.slug : null)
  );

  // Handler para navegar para a página de detalhes do produto
  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  // Atualizar categoria selecionada quando as categorias carregarem
  useEffect(() => {
    if (!selectedCategorySlug && categories.length > 0) {
      setSelectedCategorySlug(categories[0]?.slug || null);
    }
  }, [categories, selectedCategorySlug]);

  // Buscar produtos da categoria selecionada
  const { data: rawProducts, isLoading } = useProductsByCategorySlug(selectedCategorySlug || '');

  // Normalizar produtos e filtrar tabaco para usuários não logados
  const products = useMemo(() => {
    return (rawProducts || [])
      .map(normalizeProduct)
      .filter(Boolean)
      .filter((product: any) => !product.is_tabaco || user);
  }, [rawProducts, user]);

  // Limitar quantidade de produtos exibidos
  const displayProducts = products.slice(0, maxProducts);

  // Referência para scroll horizontal em mobile
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Não renderiza se não tiver categorias
  if (categories.length === 0) {
    return null;
  }

  // Separar título e palavra destacada
  const titleParts = highlightedWord
    ? title.split(highlightedWord)
    : [title];

  return (
    <section
      id={sectionId}
      className="py-16 md:py-20"
      style={{ backgroundColor: bgColor }}
    >
      <div className="container mx-auto px-6 md:px-8 lg:px-12">
        {/* Título da Seção */}
        <h2 className="font-sans text-3xl md:text-4xl text-center mb-8">
          {highlightedWord ? (
            <>
              {titleParts[0]}
              <span style={{ color: primaryColor }}>{highlightedWord}</span>
              {titleParts[1] || ''}
            </>
          ) : (
            title
          )}
        </h2>

        {/* Tabs de Categorias */}
        <div className="relative mb-10">
          {/* Botão scroll esquerda (mobile) */}
          <button
            onClick={() => scrollTabs('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white/80 rounded-full shadow md:hidden"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Container das tabs com scroll horizontal */}
          <div
            ref={tabsRef}
            className="flex justify-start md:justify-center gap-4 md:gap-8 overflow-x-auto scrollbar-hide px-8 md:px-0"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategorySlug(category.slug)}
                className={`
                  whitespace-nowrap text-sm md:text-base font-medium uppercase tracking-wide
                  py-2 px-1 border-b-2 transition-all duration-200
                  ${selectedCategorySlug === category.slug
                    ? 'border-current font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                  }
                `}
                style={
                  selectedCategorySlug === category.slug
                    ? { color: primaryColor, borderColor: primaryColor }
                    : {}
                }
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Botão scroll direita (mobile) */}
          <button
            onClick={() => scrollTabs('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white/80 rounded-full shadow md:hidden"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Grid de Produtos */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div
              className="animate-spin rounded-full h-10 w-10 border-b-2"
              style={{ borderColor: primaryColor }}
            />
          </div>
        ) : displayProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
              {displayProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={handleProductClick}
                />
              ))}
            </div>

            {/* Link Ver Todos */}
            {products && products.length > maxProducts && (
              <div className="mt-10 text-center">
                <BrandLink
                  to={`/shop?category=${selectedCategorySlug}`}
                  className="inline-flex items-center gap-2 font-bold text-sm uppercase tracking-wide transition-colors hover:opacity-80"
                  style={{ color: primaryColor }}
                >
                  Ver todos <ChevronRight size={16} />
                </BrandLink>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhum produto encontrado nesta categoria.</p>
          </div>
        )}
      </div>
    </section>
  );
}
