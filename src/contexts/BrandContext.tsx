import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentBrand } from '../lib/brand-detection';
import { getBrandConfig, BrandConfig } from '../config/brands';

interface Brand {
  id: string;
  slug: string;
  name: string;
  domain: string;
  theme: any;
  features: any;
  settings: any;
  active: boolean;
}

interface BrandContextType {
  brand: Brand | null;
  brandConfig: BrandConfig;
  isLoading: boolean;
  error: Error | null;
  currentSlug: string;
  refreshBrand: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentSlug, setCurrentSlug] = useState(getCurrentBrand());

  const loadBrand = useCallback(async (slug: string) => {
    try {
      setIsLoading(true);

      // Busca a marca do Supabase
      const { data, error: supabaseError } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      setBrand(data);
      setCurrentSlug(slug);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar marca:', err);
      setError(err as Error);

      // Em caso de erro, usa configuração local como fallback
      const config = getBrandConfig(slug);
      setBrand({
        id: 'fallback',
        slug: config.slug,
        name: config.name,
        domain: config.domain,
        theme: config.theme,
        features: config.features,
        settings: config.settings,
        active: true,
      });
      setCurrentSlug(slug);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega a marca inicial
  useEffect(() => {
    loadBrand(getCurrentBrand());
  }, [loadBrand]);

  // Escuta mudanças na URL (hash)
  useEffect(() => {
    const handleHashChange = () => {
      const newSlug = getCurrentBrand();
      if (newSlug !== currentSlug) {
        loadBrand(newSlug);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentSlug, loadBrand]);

  const refreshBrand = useCallback(() => {
    loadBrand(getCurrentBrand());
  }, [loadBrand]);

  // Sempre tem um brandConfig disponível (mesmo durante loading)
  const brandConfig = getBrandConfig(brand?.slug || currentSlug);

  return (
    <BrandContext.Provider value={{ brand, brandConfig, isLoading, error, currentSlug, refreshBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand deve ser usado dentro de um BrandProvider');
  }
  return context;
};
