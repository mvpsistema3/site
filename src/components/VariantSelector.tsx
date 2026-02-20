import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { useBrandConfig } from '../contexts/BrandContext';
import { Check, X } from 'lucide-react';

interface VariantStock {
  color: string;
  size: string;
  stock: number;
  sku?: string;
}

interface VariantSelectorProps {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
  variantStock?: VariantStock[];
  showStockIndicator?: boolean;
  compactMode?: boolean;
}

const colorNames: Record<string, string> = {
  black: 'Preto',
  white: 'Branco',
  gray: 'Cinza',
  red: 'Vermelho',
  blue: 'Azul',
  green: 'Verde',
  yellow: 'Amarelo',
  pink: 'Rosa',
  purple: 'Roxo',
  orange: 'Laranja',
  brown: 'Marrom',
  navy: 'Azul Marinho',
  beige: 'Bege',
};

const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'XXXG'];

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  product,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
  variantStock = [],
  showStockIndicator = true,
  compactMode = false,
}) => {
  const { brand } = useBrandConfig();
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  // Determina quais tamanhos estão disponíveis para a cor selecionada
  useEffect(() => {
    if (selectedColor && variantStock.length > 0) {
      const sizesForColor = variantStock
        .filter(v => v.color === selectedColor && v.stock > 0)
        .map(v => v.size);
      setAvailableSizes(sizesForColor);

      // Se o tamanho selecionado não está disponível para esta cor, limpa a seleção
      if (selectedSize && !sizesForColor.includes(selectedSize)) {
        onSizeChange('');
      }
    } else {
      setAvailableSizes(product.sizes);
    }
  }, [selectedColor, variantStock, product.sizes, selectedSize, onSizeChange]);

  // Determina quais cores estão disponíveis para o tamanho selecionado
  useEffect(() => {
    if (selectedSize && variantStock.length > 0) {
      const colorsForSize = variantStock
        .filter(v => v.size === selectedSize && v.stock > 0)
        .map(v => v.color);
      setAvailableColors(colorsForSize);
    } else {
      setAvailableColors(product.colors);
    }
  }, [selectedSize, variantStock, product.colors]);

  const getStockForVariant = (color: string, size: string): number => {
    const variant = variantStock.find(v => v.color === color && v.size === size);
    return variant?.stock || 0;
  };

  const isVariantAvailable = (color?: string, size?: string): boolean => {
    if (variantStock.length === 0) return true;

    if (color && size) {
      return getStockForVariant(color, size) > 0;
    }

    if (color && !size) {
      return variantStock.some(v => v.color === color && v.stock > 0);
    }

    if (!color && size) {
      return variantStock.some(v => v.size === size && v.stock > 0);
    }

    return true;
  };

  const getStockLevel = (stock: number): { label: string; color: string } => {
    if (stock === 0) return { label: 'Esgotado', color: 'text-red-500' };
    if (stock <= 3) return { label: `Últimas ${stock} peças`, color: 'text-orange-500' };
    if (stock <= 10) return { label: 'Poucas unidades', color: 'text-yellow-600' };
    return { label: 'Em estoque', color: 'text-green-600' };
  };

  const sortedSizes = product.sizes.sort((a, b) => {
    const indexA = sizeOrder.indexOf(a);
    const indexB = sizeOrder.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className={`space-y-${compactMode ? '3' : '4'}`}>
      {/* Seletor de Cor */}
      {product.colors.length > 0 && (
        <div>
          <label className={`block text-${compactMode ? 'sm' : 'base'} font-medium mb-2`}>
            Cor: <span className="font-normal">{colorNames[selectedColor] || selectedColor}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {product.colors.map(color => {
              const isAvailable = isVariantAvailable(color, selectedSize);
              const isSelected = selectedColor === color;

              return (
                <button
                  key={color}
                  onClick={() => isAvailable && onColorChange(color)}
                  disabled={!isAvailable}
                  className={`
                    relative group transition-all duration-200
                    ${compactMode ? 'w-8 h-8' : 'w-10 h-10'}
                    rounded-full border-2
                    ${isSelected
                      ? `border-${brand.theme.colors.primary} ring-2 ring-${brand.theme.colors.primary} ring-offset-2`
                      : 'border-gray-300 hover:border-gray-400'
                    }
                    ${!isAvailable ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  title={`${colorNames[color] || color}${!isAvailable ? ' (Indisponível)' : ''}`}
                >
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      backgroundColor: color === 'white' ? '#ffffff' :
                                     color === 'black' ? '#000000' :
                                     color === 'gray' ? '#6b7280' :
                                     color === 'red' ? '#ef4444' :
                                     color === 'blue' ? '#3b82f6' :
                                     color === 'green' ? '#10b981' :
                                     color === 'yellow' ? '#f59e0b' :
                                     color === 'pink' ? '#ec4899' :
                                     color === 'purple' ? '#8b5cf6' :
                                     color === 'orange' ? '#f97316' :
                                     color === 'brown' ? '#92400e' :
                                     color === 'navy' ? '#1e3a8a' :
                                     color === 'beige' ? '#d4a574' :
                                     color,
                      border: color === 'white' ? '1px solid #e5e7eb' : 'none',
                    }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check
                        className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} ${
                          color === 'white' || color === 'yellow' || color === 'beige'
                            ? 'text-gray-800'
                            : 'text-white'
                        }`}
                      />
                    </div>
                  )}
                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <X className={`${compactMode ? 'w-4 h-4' : 'w-5 h-5'} text-gray-600`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Seletor de Tamanho */}
      {product.sizes.length > 0 && (
        <div>
          <label className={`block text-${compactMode ? 'sm' : 'base'} font-medium mb-2`}>
            Tamanho: <span className="font-normal">{selectedSize || 'Selecione'}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {sortedSizes.map(size => {
              const isAvailable = isVariantAvailable(selectedColor, size);
              const isSelected = selectedSize === size;
              const stock = selectedColor ? getStockForVariant(selectedColor, size) : 0;
              const stockInfo = getStockLevel(stock);

              return (
                <button
                  key={size}
                  onClick={() => isAvailable && onSizeChange(size)}
                  disabled={!isAvailable}
                  className={`
                    relative group
                    ${compactMode ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'}
                    border rounded-lg transition-all duration-200
                    ${isSelected
                      ? `bg-${brand.theme.colors.primary} text-white border-${brand.theme.colors.primary}`
                      : `bg-white text-gray-700 border-gray-300 hover:border-${brand.theme.colors.primary}`
                    }
                    ${!isAvailable ? 'opacity-30 cursor-not-allowed line-through' : 'cursor-pointer'}
                  `}
                  title={!isAvailable ? 'Tamanho indisponível' : ''}
                >
                  {size}
                  {showStockIndicator && isAvailable && selectedColor && stock <= 10 && (
                    <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                      stock <= 3 ? 'bg-red-500' : 'bg-yellow-500'
                    } animate-pulse`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Indicador de Estoque */}
          {showStockIndicator && selectedColor && selectedSize && (
            <div className="mt-2">
              <p className={`text-sm ${getStockLevel(getStockForVariant(selectedColor, selectedSize)).color}`}>
                {getStockLevel(getStockForVariant(selectedColor, selectedSize)).label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Guia de Tamanhos */}
      {brand.features?.sizeGuide && (
        <button
          type="button"
          className={`text-${compactMode ? 'xs' : 'sm'} text-${brand.theme.colors.primary} hover:underline`}
          onClick={() => {
            // Aqui você pode abrir um modal com o guia de tamanhos
            console.log('Abrir guia de tamanhos');
          }}
        >
          📏 Guia de Tamanhos
        </button>
      )}

      {/* Aviso de Seleção */}
      {(!selectedColor || !selectedSize) && (
        <p className="text-sm text-gray-500 italic">
          Por favor, selecione {!selectedColor && !selectedSize ? 'cor e tamanho' : !selectedColor ? 'uma cor' : 'um tamanho'}
        </p>
      )}
    </div>
  );
};