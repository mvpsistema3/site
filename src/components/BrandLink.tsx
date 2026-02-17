import React from 'react';
import { Link, LinkProps, useNavigate as useRouterNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';

interface BrandLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

/**
 * Verifica se estamos em localhost
 */
const isLocalDev = () => {
  return typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
};

/**
 * Link que automaticamente adiciona o prefixo da marca atual
 * Ex: Se a marca atual é 'theog' e to='/shop', renderiza Link to='/theog/shop'
 */
export const BrandLink: React.FC<BrandLinkProps> = ({ to, children, ...props }) => {
  const { currentSlug } = useBrand();

  // Constrói o path com prefixo da marca (apenas em localhost)
  const brandedPath = isLocalDev() ? `/${currentSlug}${to.startsWith('/') ? to : '/' + to}` : to;

  return (
    <Link to={brandedPath} {...props}>
      {children}
    </Link>
  );
};

/**
 * Hook para construir URLs com prefixo da marca
 */
export const useBrandUrl = () => {
  const { currentSlug } = useBrand();

  const buildUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    return isLocalDev() ? `/${currentSlug}${normalizedPath}` : normalizedPath;
  };

  return { buildUrl, currentSlug, isLocalDev: isLocalDev() };
};

/**
 * Hook useNavigate que automaticamente adiciona prefixo da marca
 */
export const useBrandNavigate = () => {
  const navigate = useRouterNavigate();
  const { currentSlug } = useBrand();

  const brandNavigate = (to: string | number, options?: { replace?: boolean; state?: any }) => {
    if (typeof to === 'number') {
      navigate(to);
      return;
    }

    const normalizedPath = to.startsWith('/') ? to : '/' + to;
    const brandedPath = isLocalDev() ? `/${currentSlug}${normalizedPath}` : normalizedPath;
    navigate(brandedPath, options);
  };

  return brandNavigate;
};

export default BrandLink;
