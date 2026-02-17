// Configurações das marcas do sistema multi-tenant

// Estrutura de favicons seguindo melhores práticas
export interface FaviconConfig {
  ico?: string;           // .ico 16x16+32x32 (browsers legados)
  svg?: string;           // SVG vetorial (browsers modernos, melhor qualidade)
  png16?: string;         // PNG 16x16
  png32?: string;         // PNG 32x32
  appleTouchIcon?: string; // PNG 180x180 (iOS home screen)
  android192?: string;    // PNG 192x192 (Android)
  android512?: string;    // PNG 512x512 (Android PWA/splash)
}

export interface BrandConfig {
  slug: string;
  name: string;
  domain: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    themeColor?: string;   // Cor da barra do browser mobile
    font: string;
    logo: string;
    favicon: string;       // Compatibilidade: favicon principal (.ico ou .svg)
    favicons?: FaviconConfig; // Estrutura expandida de favicons
  };
  features: {
    loyalty: boolean;
    reviews: boolean;
    giftCards: boolean;
    installments: boolean;
  };
  settings: {
    minOrderValue: number;
    maxInstallments: number;
    freeShippingThreshold: number;
  };
}

export const BRAND_CONFIGS: Record<string, BrandConfig> = {
  sesh: {
    slug: 'sesh',
    name: 'Sesh Store',
    domain: 'seshstore.com.br',
    theme: {
      primaryColor: '#41BAC2',
      secondaryColor: '#000000',
      backgroundColor: '#FFFFFF',
      textColor: '#1A1A1A',
      themeColor: '#41BAC2',
      font: 'Inter',
      logo: '/logos/sesh.png',
      favicon: '/favicons/sesh.ico',
      favicons: {
        ico: '/favicons/sesh.ico',
        svg: '/favicons/sesh.svg',
        png32: '/favicons/sesh-32x32.png',
        appleTouchIcon: '/favicons/sesh-180x180.png',
        android192: '/favicons/sesh-192x192.png',
        android512: '/favicons/sesh-512x512.png',
      },
    },
    features: {
      loyalty: true,
      reviews: true,
      giftCards: true,
      installments: true,
    },
    settings: {
      minOrderValue: 50.00,
      maxInstallments: 12,
      freeShippingThreshold: 300.00,
    },
  },
  grupogot: {
    slug: 'grupogot',
    name: 'Grupo GOT',
    domain: 'grupogot.com',
    theme: {
      primaryColor: '#000000',
      secondaryColor: '#FFFFFF',
      backgroundColor: '#FAFAFA',
      textColor: '#333333',
      themeColor: '#000000',
      font: 'Inter',
      logo: '/logos/grupogot.svg',
      favicon: '/favicons/grupogot.ico',
      favicons: {
        ico: '/favicons/grupogot.ico',
        svg: '/favicons/grupogot.svg',
        png32: '/favicons/grupogot-32x32.png',
        appleTouchIcon: '/favicons/grupogot-180x180.png',
        android192: '/favicons/grupogot-192x192.png',
        android512: '/favicons/grupogot-512x512.png',
      },
    },
    features: {
      loyalty: true,
      reviews: true,
      giftCards: true,
      installments: true,
    },
    settings: {
      minOrderValue: 50.00,
      maxInstallments: 12,
      freeShippingThreshold: 300.00,
    },
  },
  theog: {
    slug: 'theog',
    name: 'The OG',
    domain: 'theog.com.br',
    theme: {
      primaryColor: '#6A226C',
      secondaryColor: '#000000',
      backgroundColor: '#FFFFFF',
      textColor: '#2D2D2D',
      themeColor: '#6A226C',
      font: 'Inter',
      logo: '/logos/theog.png',
      favicon: '/favicons/theog.ico',
      favicons: {
        ico: '/favicons/theog.ico',
        svg: '/favicons/theog.svg',
        png32: '/favicons/theog-32x32.png',
        appleTouchIcon: '/favicons/theog-180x180.png',
        android192: '/favicons/theog-192x192.png',
        android512: '/favicons/theog-512x512.png',
      },
    },
    features: {
      loyalty: true,
      reviews: true,
      giftCards: true,
      installments: true,
    },
    settings: {
      minOrderValue: 50.00,
      maxInstallments: 12,
      freeShippingThreshold: 300.00,
    },
  },
};

// Marca padrão (Sesh) usada quando não houver detecção de domínio
export const DEFAULT_BRAND = 'sesh';

// Helper para obter configuração da marca
export const getBrandConfig = (slug: string): BrandConfig => {
  return BRAND_CONFIGS[slug] || BRAND_CONFIGS[DEFAULT_BRAND];
};
