// Detecção de marca baseada no path da URL ou domínio

import { DEFAULT_BRAND, BRAND_CONFIGS } from '../config/brands';

// Lista de slugs de marcas válidos
const VALID_BRAND_SLUGS = Object.keys(BRAND_CONFIGS);

/**
 * Detecta a marca pelo path da URL
 * Ex: /sesh/shop -> 'sesh'
 * Ex: /theog/product/123 -> 'theog'
 * Ex: /grupogot -> 'grupogot'
 */
export const detectBrandFromPath = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  // Pega o path após o hash (para HashRouter)
  const hash = window.location.hash;
  const path = hash.startsWith('#') ? hash.slice(1) : hash;

  // Extrai o primeiro segmento do path
  const segments = path.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  // Verifica se é uma marca válida
  if (firstSegment && VALID_BRAND_SLUGS.includes(firstSegment)) {
    return firstSegment;
  }

  return null;
};

/**
 * Detecta a marca atual baseado no hostname (para produção)
 */
export const detectBrandFromHostname = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_BRAND;
  }

  const hostname = window.location.hostname;

  // Dev VPS - não detecta marca pelo hostname, usa path detection
  if (hostname === 'dev-site.grupogot.com') {
    return DEFAULT_BRAND;
  }

  // Produção - detecta pela URL
  if (hostname.includes('seshstore.com.br')) {
    return 'sesh';
  }

  if (hostname === 'grupogot.com' || hostname === 'www.grupogot.com') {
    return 'grupogot';
  }

  if (hostname.includes('theog.com.br')) {
    return 'theog';
  }

  // Fallback para marca padrão
  return DEFAULT_BRAND;
};

/**
 * Permite override manual da marca via localStorage (útil para desenvolvimento)
 */
export const setBrandOverride = (brandSlug: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('brand_override', brandSlug);
  }
};

export const getBrandOverride = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('brand_override');
  }
  return null;
};

export const clearBrandOverride = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('brand_override');
  }
};

/**
 * Função principal de detecção de marca
 * Prioridade:
 * 1. Path da URL (ex: /theog/shop)
 * 2. Override via localStorage
 * 3. Hostname (produção)
 * 4. Marca padrão (sesh)
 */
export const getCurrentBrand = (): string => {
  // 1. Primeiro tenta detectar pelo path
  const pathBrand = detectBrandFromPath();
  if (pathBrand) {
    return pathBrand;
  }

  // 2. Checa override manual
  const override = getBrandOverride();
  if (override) {
    return override;
  }

  // 3. Detecta pelo hostname
  return detectBrandFromHostname();
};

/**
 * Retorna o prefixo de URL para a marca atual
 * Usado para construir links internos
 */
export const getBrandUrlPrefix = (): string => {
  const brand = getCurrentBrand();
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Em desenvolvimento (localhost ou VPS de dev), usa o prefixo da marca
    const isDevEnv =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === 'dev-site.grupogot.com';
    if (isDevEnv) {
      return `/${brand}`;
    }
  }
  // Em produção (domínio próprio por marca), não precisa de prefixo
  return '';
};
