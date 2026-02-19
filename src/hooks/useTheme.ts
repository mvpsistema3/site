import { useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';

/**
 * Aplica as cores do tema da marca atual como CSS variables
 * Isso permite que as classes Tailwind usem cores dinâmicas
 */
export function useApplyBrandTheme() {
  const { brand, brandConfig } = useBrand();

  useEffect(() => {
    // Usa theme do banco (brand) ou do config local (brandConfig)
    const theme = brand?.theme || brandConfig.theme;

    if (theme) {
      const root = document.documentElement;

      // Aplica as cores do tema como CSS variables
      root.style.setProperty('--color-brand-primary', theme.primaryColor || '#000000');
      root.style.setProperty('--color-brand-secondary', theme.secondaryColor || '#000000');
      root.style.setProperty('--color-brand-background', theme.backgroundColor || '#FFFFFF');
      root.style.setProperty('--color-brand-text', theme.textColor || '#333333');

      // Sobrescreve a cor sesh-cyan para a cor primária da marca
      root.style.setProperty('--color-sesh-cyan', theme.primaryColor || '#000000');

      // Aplica a fonte se especificada
      if (theme.font) {
        root.style.setProperty('--font-brand', theme.font);
      }

      // Atualiza o título da página
      if (brand?.name || brandConfig.name) {
        document.title = `${brand?.name || brandConfig.name} | Loja Oficial`;
      }

      // Atualiza os favicons (estrutura expandida ou legado)
      updateFavicons(theme);

      // Atualiza theme-color para mobile browsers
      updateMetaTag('theme-color', theme.themeColor || theme.primaryColor || '#000000');
    }
  }, [brand, brandConfig]);
}

/**
 * Atualiza ou cria um link element no head
 */
function updateLinkTag(rel: string, href: string | undefined, type?: string, sizes?: string) {
  if (!href) return;

  let link = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`) as HTMLLinkElement;

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    if (sizes) link.setAttribute('sizes', sizes);
    document.head.appendChild(link);
  }

  link.href = href;
  if (type) link.type = type;
}

/**
 * Atualiza ou cria uma meta tag
 */
function updateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }

  meta.content = content;
}

/**
 * Aplica todos os favicons seguindo melhores práticas
 * Prioridade: SVG > ICO > PNG32
 */
function updateFavicons(theme: any) {
  const favicons = theme.favicons || {};

  // Favicon principal (prioriza SVG para qualidade máxima)
  const mainFavicon = favicons.svg || favicons.ico || theme.favicon;
  if (mainFavicon) {
    // Remove favicon antigo e adiciona novo
    const existingFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (existingFavicon) {
      existingFavicon.remove();
    }

    // SVG favicon (browsers modernos)
    if (favicons.svg) {
      updateLinkTag('icon', favicons.svg, 'image/svg+xml');
    } else if (favicons.ico || theme.favicon) {
      updateLinkTag('icon', favicons.ico || theme.favicon, 'image/x-icon');
    }
  }

  // PNG favicons com tamanhos específicos
  if (favicons.png16) {
    updateLinkTag('icon', favicons.png16, 'image/png', '16x16');
  }
  if (favicons.png32) {
    updateLinkTag('icon', favicons.png32, 'image/png', '32x32');
  }

  // Apple Touch Icon (iOS home screen) - 180x180
  if (favicons.appleTouchIcon) {
    updateLinkTag('apple-touch-icon', favicons.appleTouchIcon, undefined, '180x180');
  }

  // Manifest para PWA (Android)
  // Nota: O manifest é gerado separadamente, mas podemos adicionar os ícones via meta tags
  if (favicons.android192) {
    // Para Android, o manifest.json deve referenciar estes ícones
    // Aqui apenas garantimos que existam no head para fallback
  }
}

/**
 * Retorna as cores do tema atual para uso inline
 */
export function useBrandColors() {
  const { brand, brandConfig } = useBrand();
  const theme = brand?.theme || brandConfig.theme;

  return {
    primaryColor: theme?.primaryColor || '#000000',
    secondaryColor: theme?.secondaryColor || '#000000',
    backgroundColor: theme?.backgroundColor || '#FFFFFF',
    textColor: theme?.textColor || '#333333',
  };
}
