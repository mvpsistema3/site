import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { useProducts } from './useProducts';

/**
 * Hook de busca avançada com fuzzy matching
 * Suporta:
 * - Busca parcial (ex: "verde" em "camisa pima verde")
 * - Múltiplas palavras (ex: "pima verde")
 * - Tolerância a erros de digitação (ex: "camissa verdi" → "camisa verde")
 */
export function useFuzzySearch(searchQuery: string) {
  const { data: products = [], isLoading, error } = useProducts();

  // Configurar Fuse.js para busca fuzzy
  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: 'name', weight: 2 }, // Nome tem peso maior
        { name: 'description', weight: 1 },
        { name: 'category', weight: 0.5 },
      ],
      threshold: 0.4, // 0 = exato, 1 = qualquer coisa (0.4 é um bom balanço)
      distance: 100, // Distância máxima entre caracteres
      minMatchCharLength: 2, // Mínimo de caracteres para match
      includeScore: true, // Incluir score de relevância
      ignoreLocation: true, // Ignorar localização do match (permite match em qualquer parte)
      useExtendedSearch: true, // Permite operadores avançados
    });
  }, [products]);

  // Realizar busca
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return products; // Retorna todos se query vazia
    }

    const results = fuse.search(searchQuery);

    // Retornar produtos ordenados por relevância
    return results.map(result => result.item);
  }, [fuse, searchQuery, products]);

  return {
    products: searchResults,
    isLoading,
    error,
    totalResults: searchResults.length,
    isSearching: searchQuery.trim().length >= 2,
  };
}
