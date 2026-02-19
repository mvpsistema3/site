import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

const QUERY_TIMEOUT = 15000; // 15 segundos de timeout
const BRAND_CACHE_KEY = 'brand_cache_';

// Funções de cache em sessionStorage
const getCachedBrand = (slug: string): Brand | null => {
  try {
    const cached = sessionStorage.getItem(BRAND_CACHE_KEY + slug);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
};

const setCachedBrand = (slug: string, brand: Brand) => {
  try {
    sessionStorage.setItem(BRAND_CACHE_KEY + slug, JSON.stringify(brand));
  } catch { /* ignore */ }
};

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSlug = getCurrentBrand();
  const cachedBrand = getCachedBrand(initialSlug);

  const [brand, setBrand] = useState<Brand | null>(cachedBrand);
  const [isLoading, setIsLoading] = useState(!cachedBrand);
  const [error, setError] = useState<Error | null>(null);
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const loadIdRef = useRef(0);

  const fetchBrandFromDB = async (slug: string): Promise<Brand> => {
    const queryPromise = supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: query demorou mais de ${QUERY_TIMEOUT}ms`)), QUERY_TIMEOUT)
    );

    const { data, error: supabaseError } = await Promise.race([queryPromise, timeoutPromise]);
    if (supabaseError) throw supabaseError;
    return data as Brand;
  };

  const loadBrand = useCallback(async (slug: string) => {
    const loadId = ++loadIdRef.current;

    try {
      // Se já tem cache, usa imediatamente e atualiza em background
      const cached = getCachedBrand(slug);
      if (cached) {
        setBrand(cached);
        setCurrentSlug(slug);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      // Buscar do banco (atualiza cache)
      const data = await fetchBrandFromDB(slug);

      if (loadId !== loadIdRef.current) return;

      setBrand(data);
      setCurrentSlug(slug);
      setError(null);
      setCachedBrand(slug, data);
    } catch (err) {
      if (loadId !== loadIdRef.current) return;

      // Se já tem cache, mantém o que tem e não mostra erro
      const cached = getCachedBrand(slug);
      if (cached) {
        console.warn(`[BrandContext] Query falhou para "${slug}", usando cache.`);
        setBrand(cached);
        setCurrentSlug(slug);
        setError(null);
        return;
      }

      console.error(`[BrandContext] Erro ao carregar marca "${slug}":`, err);
      setError(err as Error);

      // Fallback: usa configuração local
      const config = getBrandConfig(slug);
      setBrand({
        id: '',
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
      if (loadId === loadIdRef.current) {
        setIsLoading(false);
      }
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
