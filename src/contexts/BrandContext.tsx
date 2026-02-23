import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';
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

const BRAND_CACHE_KEY = 'brand_cache_';
const QUERY_TIMEOUT = 8000;

// Cache em sessionStorage
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

  // Fonte primária: cache ou config local. NUNCA espera o DB para renderizar.
  const [brand, setBrand] = useState<Brand | null>(cachedBrand);
  const [isLoading, setIsLoading] = useState(!cachedBrand); // true se não tem cache
  const [error, setError] = useState<Error | null>(null);
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const loadIdRef = useRef(0);

  // Busca do DB via fetch direto com anon key — SEM passar pelo supabase client.
  // Motivo: o supabase client injeta o JWT do usuário logado em toda request.
  // Se o JWT estiver expirado (ex: hard refresh), o Supabase retorna 401
  // ANTES de checar RLS, mesmo que a tabela brands permita acesso público.
  const fetchBrandFromDB = useCallback(async (slug: string): Promise<Brand> => {
    const url = `${supabaseUrl}/rest/v1/brands?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=*`;
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Accept': 'application/vnd.pgrst.object+json', // equivale a .single()
      },
      signal: AbortSignal.timeout(QUERY_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json() as Brand;
  }, []);

  const loadBrand = useCallback(async (slug: string) => {
    const loadId = ++loadIdRef.current;

    const cached = getCachedBrand(slug);
    if (cached) {
      // Cache existe — usar imediatamente, sem loading
      setBrand(cached);
      setCurrentSlug(slug);
      setIsLoading(false);
    } else {
      // Sem cache — manter loading enquanto busca do banco
      setIsLoading(true);
    }

    try {
      const data = await fetchBrandFromDB(slug);
      if (loadId !== loadIdRef.current) return;

      setBrand(data);
      setCurrentSlug(slug);
      setError(null);
      setCachedBrand(slug, data);
      setIsLoading(false);
    } catch {
      if (loadId !== loadIdRef.current) return;
      console.warn(`[BrandContext] DB update falhou para "${slug}", usando dados locais.`);

      // Se não tinha cache E o fetch falhou, usar config local como fallback
      if (!cached) {
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
      }
      setIsLoading(false);

      // Retry após 3 segundos (uma tentativa)
      setTimeout(() => {
        if (loadIdRef.current === loadId) {
          fetchBrandFromDB(slug)
            .then((data) => {
              setBrand(data);
              setCurrentSlug(slug);
              setError(null);
              setCachedBrand(slug, data);
            })
            .catch(() => {
              console.warn(`[BrandContext] Retry também falhou para "${slug}".`);
            });
        }
      }, 3000);
    }
  }, [fetchBrandFromDB]);

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

  // Sempre disponível — mesmo sem DB
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
