import React, { useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Product } from '../types';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article' | 'category';
  product?: Product;
  noIndex?: boolean;
  canonicalUrl?: string;
  jsonLd?: object;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  product,
  noIndex = false,
  canonicalUrl,
  jsonLd,
}) => {
  const { brandConfig } = useBrand();

  // Construir valores padrão baseados na marca
  const defaultTitle = brandConfig.name;
  const defaultDescription = `${brandConfig.name} - Moda e estilo com qualidade superior`;
  const brandKeywords = [
    brandConfig.name.toLowerCase(),
    'moda',
    'roupas',
    'estilo',
    'tendências',
    'fashion',
    'comprar online',
  ];

  // Valores finais
  const finalTitle = title ? `${title} | ${brandConfig.name}` : defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalKeywords = [...new Set([...keywords, ...brandKeywords])].join(', ');
  const finalImage = image || brandConfig.theme.logo;
  const finalUrl = url || window.location.href;

  // Schema.org para produtos
  const productSchema = product ? {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: finalDescription,
    brand: {
      '@type': 'Brand',
      name: brandConfig.name,
    },
    offers: {
      '@type': 'Offer',
      url: finalUrl,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: brandConfig.name,
      },
    },
    aggregateRating: product.rating > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toString(),
      reviewCount: product.reviews.toString(),
    } : undefined,
  } : null;

  // Schema.org para organização
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brandConfig.name,
    url: `https://${brandConfig.domain}`,
    logo: brandConfig.theme.logo,
    sameAs: [
      // Adicionar links de redes sociais da marca aqui
    ],
  };

  // Schema.org para breadcrumbs
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `https://${brandConfig.domain}`,
      },
      // Adicionar mais items de breadcrumb conforme necessário
    ],
  };

  useEffect(() => {
    // Atualizar meta tags no head
    document.title = finalTitle;

    // Meta Description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = finalDescription;

    // Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = finalKeywords;

    // Robots
    if (noIndex) {
      let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.name = 'robots';
        document.head.appendChild(metaRobots);
      }
      metaRobots.content = 'noindex, nofollow';
    }

    // Canonical URL
    if (canonicalUrl) {
      let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.rel = 'canonical';
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.href = canonicalUrl;
    }

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: finalTitle },
      { property: 'og:description', content: finalDescription },
      { property: 'og:image', content: finalImage },
      { property: 'og:url', content: finalUrl },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: brandConfig.name },
      { property: 'og:locale', content: 'pt_BR' },
    ];

    ogTags.forEach(({ property, content }) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    });

    // Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: finalTitle },
      { name: 'twitter:description', content: finalDescription },
      { name: 'twitter:image', content: finalImage },
    ];

    twitterTags.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    });

    // Adicionar Schema.org JSON-LD
    const schemas = [
      organizationSchema,
      breadcrumbSchema,
      productSchema,
      jsonLd,
    ].filter(Boolean);

    schemas.forEach((schema, index) => {
      const scriptId = `seo-schema-${index}`;
      let script = document.getElementById(scriptId);

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }

      script.textContent = JSON.stringify(schema);
    });

    // Favicons - usa estrutura expandida se disponível
    const favicons = brandConfig.theme.favicons || {};
    const mainFavicon = favicons.svg || favicons.ico || brandConfig.theme.favicon;

    // Favicon principal (SVG preferido para qualidade)
    if (mainFavicon) {
      let favicon = document.querySelector('link[rel="icon"]:not([sizes])') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = mainFavicon;
      favicon.type = favicons.svg ? 'image/svg+xml' : 'image/x-icon';
    }

    // PNG 32x32
    if (favicons.png32) {
      let favicon32 = document.querySelector('link[rel="icon"][sizes="32x32"]') as HTMLLinkElement;
      if (!favicon32) {
        favicon32 = document.createElement('link');
        favicon32.rel = 'icon';
        favicon32.setAttribute('sizes', '32x32');
        favicon32.type = 'image/png';
        document.head.appendChild(favicon32);
      }
      favicon32.href = favicons.png32;
    }

    // Apple Touch Icon (180x180 para iOS)
    const appleTouchIconSrc = favicons.appleTouchIcon || brandConfig.theme.logo;
    let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleTouchIcon) {
      appleTouchIcon = document.createElement('link');
      appleTouchIcon.rel = 'apple-touch-icon';
      appleTouchIcon.setAttribute('sizes', '180x180');
      document.head.appendChild(appleTouchIcon);
    }
    appleTouchIcon.href = appleTouchIconSrc;

    // Theme Color (cor da barra do browser mobile)
    const themeColorValue = brandConfig.theme.themeColor || brandConfig.theme.primaryColor;
    let themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      document.head.appendChild(themeColor);
    }
    themeColor.content = themeColorValue;

    // Cleanup function
    return () => {
      // Limpar schemas ao desmontar
      schemas.forEach((_, index) => {
        const scriptId = `seo-schema-${index}`;
        const script = document.getElementById(scriptId);
        if (script) {
          script.remove();
        }
      });
    };
  }, [
    finalTitle,
    finalDescription,
    finalKeywords,
    finalImage,
    finalUrl,
    type,
    brandConfig,
    noIndex,
    canonicalUrl,
    product,
    jsonLd,
  ]);

  // Este componente não renderiza nada visualmente
  return null;
};

// Hook para facilitar o uso do SEOHead
export const useSEO = (props: SEOHeadProps) => {
  const { brandConfig } = useBrand();

  useEffect(() => {
    // Aplicar as meta tags quando o hook for usado
    const seoComponent = document.createElement('div');
    seoComponent.id = 'seo-head-hook';
    document.body.appendChild(seoComponent);

    return () => {
      const element = document.getElementById('seo-head-hook');
      if (element) {
        element.remove();
      }
    };
  }, [props]);

  return {
    brandName: brandConfig.name,
    brandDomain: brandConfig.domain,
  };
};