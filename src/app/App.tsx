import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, Navigate, useParams, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  Search, User, ShoppingBag, Heart, Menu, X,
  ChevronLeft, ChevronRight, Star, Truck, ShieldCheck,
  CreditCard, Instagram, Facebook, Youtube, Twitter,
  MapPin, Calendar, Lock, CheckCircle, Minus, Plus, Trash2, HelpCircle,
  ArrowRight, Package, LogOut
} from 'lucide-react';
import { Product, CartItem, FilterState } from '../types';
import { BrandProvider, useBrand } from '../contexts/BrandContext';
import { SearchProvider, useSearch } from '../contexts/SearchContext';
import { AuthProvider } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';
import { useFeaturedProducts, useProducts, useProduct, useProductsByCategorySlug, useProductSuggestions } from '../hooks/useProducts';
import { useFuzzySearch } from '../hooks/useFuzzySearch';
import { useHeroCollection, useProductsByCollectionSlug } from '../hooks/useCollections';
import { useCategories, useCategoryTree, useMenuCategories, useTabacariaCategories, Category } from '../hooks/useCategories';
import { useFAQs, useFAQsByCategory } from '../hooks/useFAQs';
import { useGroupedFooterLinks } from '../hooks/useFooterLinks';
import { FAQPage } from '../pages/FAQPage';
import { StaticPageRenderer } from '../pages/StaticPageRenderer';
import { ProfilePage } from '../pages/ProfilePage';
import { OrdersPage } from '../pages/OrdersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useApplyBrandTheme, useBrandColors } from '../hooks/useTheme';
import { getBrandUrlPrefix } from '../lib/brand-detection';
import { createAsaasPayment, BillingType } from '../lib/asaas';
import { BRAND_CONFIGS } from '../config/brands';
import { BrandLink, useBrandUrl, useBrandNavigate } from '../components/BrandLink';
import { SEOHead } from '../components/SEOHead';
import { ShippingCalculator } from '../components/ShippingCalculator';
import { SearchPreview } from '../components/SearchPreview';
import { CouponInput } from '../components/CouponInput';
import { PriceDisplay } from '../components/PriceDisplay';
import { StockWarning } from '../components/StockWarning';
import { FreeShippingBanner } from '../components/FreeShippingBanner';
import { FreeShippingProgress } from '../components/FreeShippingProgress';
import { AgeVerificationPopup } from '../components/AgeVerificationPopup';
import { PromoPopup } from '../components/PromoPopup';
import { LoginModal } from '../components/LoginModal';
import { UserMenu } from '../components/UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { useCartStore, type CartItem as StoreCartItem } from '../stores/cartStore';
import { useToastStore } from '../stores/toastStore';
import { useIsFavorite, useToggleFavorite, useFavoritesCount } from '../hooks/useFavorites';
import { ImageLightbox } from '../components/ImageLightbox';
import { TrustBadges } from '../components/TrustBadges';
import { ProductAccordion } from '../components/ProductAccordion';
import { StickyMobileCTA } from '../components/StickyMobileCTA';
import { ProductDetailSkeleton } from '../components/ProductDetailSkeleton';
import { ShopPageSkeleton } from '../components/ShopPageSkeleton';
import { MarqueeBanner } from '../components/MarqueeBanner';
import { useBanners } from '../hooks/useBanners';
import { ProductSectionWithTabs } from '../components/ProductSectionWithTabs';
import { ToastNotification } from '../components/ToastNotification';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';

// --- Contexts ---

interface CartContextType {
  cart: StoreCartItem[];
  addToCart: (product: Product, size: string, color: string) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

const useCart = () => useContext(CartContext);

// --- Utils ---

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPathRef = React.useRef(pathname);
  const scrollPositions = React.useRef<Record<string, number>>({});

  useEffect(() => {
    const prevPath = prevPathRef.current;

    if (navType === 'PUSH' || navType === 'REPLACE') {
      // Salva posição do scroll antes de navegar para produto
      if (/^(\/[^/]+)?\/product\//.test(pathname)) {
        scrollPositions.current[prevPath] = window.scrollY;
      }
      window.scrollTo(0, 0);
    } else if (navType === 'POP') {
      // Voltando de uma página de produto: restaura posição
      if (/^(\/[^/]+)?\/product\//.test(prevPath) && scrollPositions.current[pathname] != null) {
        const savedPos = scrollPositions.current[pathname];
        delete scrollPositions.current[pathname];
        requestAnimationFrame(() => window.scrollTo(0, savedPos));
      } else {
        // Qualquer outro POP: vai pro topo
        window.scrollTo(0, 0);
      }
    }

    prevPathRef.current = pathname;
  }, [pathname, navType]);

  return null;
};

// --- Scroll Animation Components ---

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
  scale?: number;
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 60,
  once = true,
  threshold = 0.15,
  scale,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: threshold, margin: '0px 0px -100px 0px' });
  const [revealed, setRevealed] = React.useState(false);

  // Só revela se o usuário já scrollou (scrollY > 0)
  // Isso impede seções abaixo do fold de animarem no carregamento
  React.useEffect(() => {
    if (revealed) return;

    const check = () => {
      if (isInView && window.scrollY > 0) {
        setRevealed(true);
      }
    };

    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [isInView, revealed]);

  const directionMap: Record<string, { x?: number; y?: number }> = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  const initialOffset = directionMap[direction] || {};

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        ...initialOffset,
        ...(scale ? { scale } : {}),
      }}
      animate={revealed ? {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      } : {
        opacity: 0,
        ...initialOffset,
        ...(scale ? { scale } : {}),
      }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  speed?: number;
}

const ParallaxImage: React.FC<ParallaxImageProps> = ({
  src,
  alt,
  className = '',
  speed = 0.3,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.img
        src={src}
        alt={alt}
        className={className}
        style={{ y, scale: imgScale }}
      />
    </div>
  );
};

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  threshold?: number;
}

const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = '',
  staggerDelay = 0.08,
  threshold = 0.1,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: threshold });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 30 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
      },
    }}
  >
    {children}
  </motion.div>
);

// --- Components ---

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled = false,
  fullWidth = false,
  type = 'button',
  form
}) => {
  const { primaryColor } = useBrandColors();
  const baseStyle = "font-bold uppercase tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center";

  const displayClass = fullWidth ? 'flex w-full' : 'inline-flex';
  const padding = variant === 'ghost' ? 'px-2 py-1' : 'px-8 py-3';

  // Estilos base por variante (sem cores da marca)
  const variantStyles: Record<string, string> = {
    primary: "text-white hover:bg-black border border-transparent rounded",
    secondary: "bg-black text-white rounded",
    outline: "bg-transparent border-2 border-black text-black hover:bg-black hover:text-white rounded",
    ghost: "bg-transparent text-black underline-offset-4 hover:underline",
    success: "bg-green-600 text-white hover:bg-green-700 rounded",
    danger: "bg-red-500 text-white hover:bg-red-600 rounded"
  };

  // Estilos inline para variantes que usam cor da marca
  const dynamicStyle: React.CSSProperties = variant === 'primary'
    ? { backgroundColor: primaryColor }
    : variant === 'secondary'
    ? { ['--hover-bg' as string]: primaryColor }
    : {};

  return (
    <button
      type={type}
      form={form}
      className={`${baseStyle} ${variantStyles[variant]} ${displayClass} ${padding} ${className}`}
      style={dynamicStyle}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (variant === 'secondary') {
          e.currentTarget.style.backgroundColor = primaryColor;
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'secondary') {
          e.currentTarget.style.backgroundColor = 'black';
        }
      }}
    >
      {children}
    </button>
  );
};

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useBrandNavigate();
  const { primaryColor } = useBrandColors();
  const { user } = useAuth();
  const isFavorite = useIsFavorite(product.id);
  const { mutate: toggleFavorite } = useToggleFavorite();

  // Compatibilidade com dados mockados e do Supabase
  const images = product.product_images
    ? product.product_images.sort((a: any, b: any) => a.position - b.position).map((img: any) => img.url)
    : product.images || [];

  const variants = product.product_variants || [];
  const colors = variants.length > 0
    ? [...new Set(variants.map((v: any) => v.color).filter(Boolean))]
    : product.colors || [];

  const price = Number(product.price);
  const compareAtPrice = product.compare_at_price ? Number(product.compare_at_price) : product.originalPrice;
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : product.discount;

  return (
    <div
      className="group cursor-pointer relative transition-all duration-300 ease-out hover:-translate-y-1 active:scale-98"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Image Container - Premium hover effects */}
      <div className="relative aspect-square overflow-hidden bg-gray-50 mb-4 rounded-lg shadow-sm group-hover:shadow-xl transition-shadow duration-300">
        {/* Main Image */}
        <img
          src={images[0] || ''}
          alt={product.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-500 ease-out ${isHovered ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
        />
        {/* Hover Image */}
        <img
          src={images[1] || images[0] || ''}
          alt={product.name}
          loading="lazy"
          className={`absolute top-0 left-0 w-full h-full object-cover transition-all duration-500 ease-out ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
        />

        {/* Badge de desconto - Premium styling */}
        {discount && discount > 0 && (
          <span
            className="absolute top-3 left-3 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            {discount}% OFF
          </span>
        )}

        {/* Wishlist Button - Premium backdrop blur */}
        <button
          className={`absolute top-3 right-3 p-2 bg-white/95 backdrop-blur-sm rounded-full transition-all duration-300 shadow-md hover:scale-110 active:scale-95 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 md:opacity-100 md:translate-y-0'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!user) {
              // Dispatch event to open login modal
              window.dispatchEvent(new CustomEvent('open-login-modal'));
              return;
            }
            toggleFavorite(product.id);
          }}
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart
            size={18}
            strokeWidth={2}
            className={`transition-colors duration-200 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
          />
        </button>

        {/* Quick Buy Button - Premium styling */}
        <button
          className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 text-white text-xs font-bold uppercase rounded-lg transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/product/${product.id}`);
          }}
          style={{
            backgroundColor: primaryColor,
            minWidth: '140px'
          }}
        >
          Compra Rápida
        </button>
      </div>

      {/* Product Info - Premium typography */}
      <div className="space-y-1.5">
        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug group-hover:text-gray-700 transition-colors" title={product.name}>
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-bold text-lg text-gray-900">
            R$ {price.toFixed(2).replace('.', ',')}
          </span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-xs text-gray-400 opacity-60 line-through">
              R$ {Number(compareAtPrice).toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
        {colors.length > 0 && (
          <div className="text-xs text-gray-500 opacity-70">
            {colors.length} {colors.length === 1 ? 'cor disponível' : 'cores disponíveis'}
          </div>
        )}
      </div>
    </div>
  );
};

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { primaryColor } = useBrandColors();
  const { data: faqs, isLoading } = useFAQsByCategory('geral');

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Não renderiza se não tiver FAQs
  if (isLoading || !faqs || faqs.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-20 md:py-28 border-t border-gray-100">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12 md:mb-16">
          <div className="w-12 h-[2px] mx-auto mb-6" style={{ backgroundColor: primaryColor }} />
          <h2 className="font-sans text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">
            DÚVIDAS <span style={{ color: primaryColor }}>FREQUENTES</span>
          </h2>
          <p className="text-gray-400 text-sm tracking-[0.3em] uppercase">Tudo o que você precisa saber</p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="border border-gray-200 hover:border-black transition-colors bg-gray-50/50">
              <button
                className="w-full flex justify-between items-center p-5 text-left font-bold text-sm uppercase tracking-wide focus:outline-none"
                onClick={() => toggle(index)}
              >
                <span style={openIndex === index ? { color: primaryColor } : {}}>
                  {faq.question}
                </span>
                {openIndex === index ? <Minus size={18} /> : <Plus size={18} />}
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 text-gray-600 text-sm leading-relaxed border-t border-dashed border-gray-200 mt-2">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500 mb-4">Ainda tem dúvidas?</p>
          <Button variant="outline" className="gap-2 mx-auto">
             <HelpCircle size={16} /> FALE NO WHATSAPP
          </Button>
        </div>
      </div>
    </section>
  );
};

const CartDrawer = () => {
  const { cart, removeFromCart, isCartOpen, setIsCartOpen, cartCount } = useCart();
  const navigate = useNavigate();
  const { primaryColor } = useBrandColors();

  if (!isCartOpen) return null;

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleGoToCart = () => {
    setIsCartOpen(false);
    navigate('/cart');
  };

  return (
    <>
      {/* Backdrop with enhanced blur */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-md transition-all duration-300 animate-fade-in"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transform transition-all duration-300 animate-slide-in-right">

        {/* Header - Premium White */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-b from-white to-gray-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag size={24} className="text-gray-900" strokeWidth={2} />
                {/* Item Count Badge */}
                {cartCount > 0 && (
                  <div
                    className="absolute -top-2 -right-2 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cartCount}
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-sans text-lg font-bold tracking-tight">Sua sacola</h2>
                <p className="text-xs text-gray-500">
                  {cartCount} {cartCount === 1 ? 'item' : 'itens'}
                </p>
              </div>
            </div>

            {/* Close Button - Premium */}
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 active:scale-95 group"
              aria-label="Fechar sacola"
            >
              <X size={24} className="text-gray-600 group-hover:text-gray-900 transition-colors" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Items List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            /* Empty State - Premium */
            <div className="flex flex-col items-center justify-center h-full py-12 animate-fade-in">
              <div className="relative mb-6">
                {/* Icon Container with Gradient */}
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner">
                  <ShoppingBag size={40} className="text-gray-400 relative z-10" strokeWidth={1.5} />
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />
                </div>
                {/* Decorative circle */}
                <div
                  className="absolute inset-0 rounded-2xl -z-10 scale-110 blur-xl animate-pulse"
                  style={{ backgroundColor: `${primaryColor}1A` }}
                />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">
                Sacola vazia
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed max-w-xs">
                Adicione produtos incríveis e eles aparecerão aqui
              </p>

              <Button
                variant="primary"
                onClick={() => { setIsCartOpen(false); navigate('/shop'); }}
                className="group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Explorar produtos
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </div>
          ) : (
            /* Product Items - Premium Cards */
            <div className="space-y-3">
              {cart.map((item, idx) => (
                <div
                  key={`${item.id}-${item.selectedSize}-${item.selectedColor}-${idx}`}
                  className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex gap-4">
                    {/* Product Image - Compact */}
                    <div className="relative w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Subtle overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Top Section */}
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-bold text-sm leading-tight tracking-tight line-clamp-2">
                            {item.name}
                          </h3>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded"
                            aria-label="Remover item"
                          >
                            <X size={16} strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Attributes - Compact Badges */}
                        <div className="flex gap-1.5 mb-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                            {item.selectedColor}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                            {item.selectedSize}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Section - Price & Quantity */}
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Quantidade: {item.quantity}</span>
                          <span className="font-bold text-base tracking-tight">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover accent line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"
                    style={{
                      background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}80)`
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Premium Sticky */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 bg-white shadow-2xl">
            <div className="px-6 py-5 space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm font-medium">Subtotal</span>
                <span className="text-2xl font-bold tracking-tight">
                  R$ {total.toFixed(2)}
                </span>
              </div>

              {/* Info Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 text-center leading-relaxed">
                  Frete e descontos calculados na próxima etapa
                </p>
              </div>

              {/* CTA Button */}
              <Button
                variant="primary"
                fullWidth
                onClick={handleGoToCart}
                className="group relative overflow-hidden h-12 font-bold"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Ver sacola completa
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>

              {/* Trust Badges - Compact */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center">
                  <ShieldCheck size={16} className="mx-auto mb-0.5 text-green-600" strokeWidth={2} />
                  <p className="text-xs text-gray-600">Seguro</p>
                </div>
                <div className="text-center">
                  <Truck size={16} className="mx-auto mb-0.5 text-blue-600" strokeWidth={2} />
                  <p className="text-xs text-gray-600">Frete rápido</p>
                </div>
                <div className="text-center">
                  <CreditCard size={16} className="mx-auto mb-0.5 text-purple-600" strokeWidth={2} />
                  <p className="text-xs text-gray-600">12x s/ juros</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// --- Layout Components ---

const Header = () => {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { brand, brandConfig } = useBrand();
  const { primaryColor } = useBrandColors();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const { user, signOut } = useAuth();
  const addToast = useToastStore((s: any) => s.addToast);
  const favoritesCount = useFavoritesCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showSearchPreview, setShowSearchPreview] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const navigate = useBrandNavigate();

  // Listen for open-login-modal events (from wishlist buttons when not logged in)
  useEffect(() => {
    const handler = () => setIsLoginModalOpen(true);
    window.addEventListener('open-login-modal', handler);
    return () => window.removeEventListener('open-login-modal', handler);
  }, []);

  // Limpar busca em mudanças de rota (exceto quando está em /shop)
  useEffect(() => {
    if (!location.pathname.includes('/shop')) {
      clearSearch();
    }
    setShowSearchPreview(false);
    setIsMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate('/shop');
      setIsMobileMenuOpen(false);
      setShowSearchPreview(false);
    }
  };

  useEffect(() => {
    setShowSearchPreview(searchQuery.trim().length >= 2);
  }, [searchQuery]);

  const { data: menuCategories } = useMenuCategories();

  const brandName = brand?.name || brandConfig.name || 'Sesh Store';
  const displayName = brandName.split(' ')[0];
  const logoUrl = brand?.theme?.logo || brandConfig.theme.logo;
  const hasLoyalty = brand?.features?.loyalty ?? brandConfig.features.loyalty;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAccountPage = ['/profile', '/orders', '/settings', '/favorites'].some(p => location.pathname.includes(p));

  // Icon button base style
  const iconBtnClass = "relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90";

  return (
    <>
      <FreeShippingBanner />

      <header
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,1)',
          backdropFilter: isScrolled ? 'blur(12px) saturate(1.2)' : 'none',
          boxShadow: isScrolled
            ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)'
            : 'none',
        }}
      >
        {/* Main header bar */}
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div
            className="flex items-center justify-between gap-3 lg:gap-6 transition-all duration-300"
            style={{ height: isScrolled ? '56px' : '64px' }}
          >
            {/* Left: Mobile menu + Logo */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors active:scale-90"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Menu"
              >
                <Menu size={20} strokeWidth={2} />
              </button>

              <div
                className="cursor-pointer flex-shrink-0"
                onClick={() => navigate('/')}
              >
                {logoUrl && !logoUrl.includes('default') ? (
                  <img
                    src={logoUrl}
                    alt={brandName}
                    className="transition-all duration-300"
                    style={{ height: isScrolled ? '32px' : '36px' }}
                  />
                ) : (
                  <span
                    className="font-sans font-bold tracking-tight select-none transition-all duration-300"
                    style={{
                      color: primaryColor,
                      fontSize: isScrolled ? '1.5rem' : '1.75rem',
                      lineHeight: 1.1,
                    }}
                  >
                    {displayName}
                  </span>
                )}
              </div>
            </div>

            {/* Center: Desktop search */}
            <div className="hidden lg:block flex-1 max-w-lg mx-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowSearchPreview(true)}
                  placeholder="Buscar produtos..."
                  className="w-full rounded-full py-2.5 pl-10 pr-4 text-[13px] text-gray-700 placeholder:text-gray-400 bg-gray-50/80 border border-gray-200/80 focus:outline-none focus:border-gray-300 focus:bg-white focus:shadow-sm transition-all duration-200"
                  style={{
                    borderColor: searchQuery ? `${primaryColor}50` : undefined,
                  }}
                />
                <button
                  onClick={handleSearch}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Search size={16} strokeWidth={2} />
                </button>

                {showSearchPreview && (
                  <SearchPreview
                    searchQuery={searchQuery}
                    onClose={() => setShowSearchPreview(false)}
                    onSelectProduct={() => setShowSearchPreview(false)}
                  />
                )}
              </div>
            </div>

            {/* Right: Action icons */}
            <div className="flex items-center gap-1">
              {/* Mobile search */}
              <button
                className={`lg:hidden ${iconBtnClass} text-gray-600 hover:bg-gray-100`}
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                aria-label="Buscar"
              >
                <Search size={18} strokeWidth={2} />
              </button>

              {/* Favorites (desktop) */}
              <button
                className={`hidden lg:flex ${iconBtnClass} text-gray-500 hover:text-gray-700 hover:bg-gray-50`}
                onClick={() => navigate('/favorites')}
                aria-label="Favoritos"
              >
                <Heart size={18} strokeWidth={2} />
                {favoritesCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </span>
                )}
              </button>

              {/* User/Login */}
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className={`${iconBtnClass} text-gray-500 hover:text-gray-700 hover:bg-gray-50`}
                  aria-label="Login"
                >
                  <User size={18} strokeWidth={2} />
                </button>
              )}

              {/* Cart */}
              <button
                className={`${iconBtnClass} text-gray-500 hover:text-gray-700 hover:bg-gray-50`}
                onClick={() => setIsCartOpen(true)}
                aria-label="Carrinho"
              >
                <ShoppingBag size={18} strokeWidth={2} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 text-white text-[9px] font-bold min-w-[1rem] h-4 px-0.5 flex items-center justify-center rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Category nav row (desktop, hide on account pages) */}
        {!isAccountPage && (
          <div className="hidden lg:block border-t border-gray-100/80">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
              <nav className="flex items-center justify-center gap-1 py-0">
                <BrandLink
                  to="/shop"
                  className="relative px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-gray-600 hover:text-gray-900 transition-colors group"
                >
                  Todos
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] rounded-full transition-all duration-300 group-hover:w-3/4"
                    style={{ backgroundColor: primaryColor }}
                  />
                </BrandLink>

                {menuCategories?.map((category) => (
                  <div key={category.id} className="relative group">
                    <BrandLink
                      to={`/shop?category=${category.slug}`}
                      className="relative flex items-center gap-1 px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {category.name}
                      {category.children && category.children.length > 0 && (
                        <ChevronRight
                          size={12}
                          className="rotate-90 opacity-40 group-hover:opacity-70 group-hover:rotate-[270deg] transition-all duration-300"
                          strokeWidth={2.5}
                        />
                      )}
                      <span
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] rounded-full transition-all duration-300 group-hover:w-3/4"
                        style={{ backgroundColor: primaryColor }}
                      />
                    </BrandLink>

                    {category.children && category.children.length > 0 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="bg-white rounded-lg shadow-lg border border-gray-100 py-1.5 min-w-[180px]">
                          {category.children.map((sub) => (
                            <BrandLink
                              key={sub.id}
                              to={`/shop?category=${sub.slug}`}
                              className="block px-4 py-2 text-[12px] font-medium normal-case text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                            >
                              {sub.name}
                            </BrandLink>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {hasLoyalty && (
                  <BrandLink
                    to="/club"
                    className="relative px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-widest text-gray-600 hover:text-gray-900 transition-colors group"
                  >
                    {displayName} Club
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] rounded-full transition-all duration-300 group-hover:w-3/4"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </BrandLink>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setShowSearchPreview(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden sticky z-40 bg-white border-b border-gray-100 shadow-sm"
              style={{ top: isScrolled ? '56px' : '64px' }}
            >
              <div className="container mx-auto px-4 py-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                        setIsMobileSearchOpen(false);
                      }
                    }}
                    onFocus={() => searchQuery.trim().length >= 2 && setShowSearchPreview(true)}
                    placeholder="Buscar produtos..."
                    autoFocus
                    className="w-full rounded-full py-2.5 pl-10 pr-10 text-[13px] text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-gray-300 focus:bg-white transition-all duration-200"
                    style={{ borderColor: searchQuery ? `${primaryColor}50` : undefined }}
                  />
                  <Search size={16} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <button
                    onClick={() => {
                      setIsMobileSearchOpen(false);
                      setShowSearchPreview(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>

                  {showSearchPreview && (
                    <SearchPreview
                      searchQuery={searchQuery}
                      onClose={() => setShowSearchPreview(false)}
                      onSelectProduct={() => {
                        setShowSearchPreview(false);
                        setIsMobileSearchOpen(false);
                      }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile drawer menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/30"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute top-0 left-0 w-[82%] max-w-[320px] h-full bg-white shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 flex-shrink-0">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {logoUrl && !logoUrl.includes('default') ? (
                    <img src={logoUrl} alt={brandName} className="h-8" />
                  ) : (
                    <span
                      className="font-sans text-xl font-bold tracking-tight"
                      style={{ color: primaryColor }}
                    >
                      {displayName}
                    </span>
                  )}
                </motion.div>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  aria-label="Fechar menu"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.04, delayChildren: 0.1 }
                    }
                  }}
                  className="py-3 px-3"
                >
                  <motion.div variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}>
                    <BrandLink
                      to="/shop"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 text-[13px] font-semibold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide"
                    >
                      <Package size={16} className="text-gray-400" />
                      Todos os Produtos
                    </BrandLink>
                  </motion.div>

                  <div className="h-px bg-gray-100 mx-3 my-1.5" />

                  {menuCategories?.map((category) => (
                    <motion.div
                      key={category.id}
                      variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                    >
                      <div className="flex items-center">
                        <BrandLink
                          to={`/shop?category=${category.slug}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex-1 px-3 py-3 text-[13px] font-semibold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors uppercase tracking-wide"
                        >
                          {category.name}
                        </BrandLink>

                        {category.children && category.children.length > 0 && (
                          <button
                            onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                            aria-label={`Expandir ${category.name}`}
                          >
                            <ChevronRight
                              size={14}
                              strokeWidth={2.5}
                              className={`text-gray-400 transition-transform duration-200 ${
                                expandedCategory === category.id ? 'rotate-90' : ''
                              }`}
                              style={{ color: expandedCategory === category.id ? primaryColor : undefined }}
                            />
                          </button>
                        )}
                      </div>

                      <AnimatePresence>
                        {category.children && category.children.length > 0 && expandedCategory === category.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden ml-5 pl-3 border-l-2"
                            style={{ borderColor: `${primaryColor}25` }}
                          >
                            {category.children.map((sub) => (
                              <BrandLink
                                key={sub.id}
                                to={`/shop?category=${sub.slug}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block px-3 py-2.5 text-[12px] font-medium text-gray-500 hover:text-gray-800 rounded-md hover:bg-gray-50 transition-colors"
                              >
                                {sub.name}
                              </BrandLink>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {hasLoyalty && (
                    <>
                      <div className="h-px bg-gray-100 mx-3 my-1.5" />
                      <motion.div variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}>
                        <BrandLink
                          to="/club"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 mx-1 px-3 py-3 text-[13px] font-semibold rounded-lg transition-colors uppercase tracking-wide"
                          style={{ color: primaryColor, backgroundColor: `${primaryColor}08` }}
                        >
                          <Star size={16} />
                          {displayName} Club
                        </BrandLink>
                      </motion.div>
                    </>
                  )}
                </motion.div>
              </nav>

              {/* Drawer footer */}
              {user && (
                <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={async () => {
                      await signOut();
                      useToastStore.getState().queueToast('Você saiu da sua conta. Até logo!', 'info');
                      window.location.hash = '#/';
                      window.location.reload();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={14} />
                    Sair da conta
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CartDrawer />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
};

const Footer = () => {
  const { brand, brandConfig } = useBrand();
  const { primaryColor } = useBrandColors();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { data: dbFooterLinks, isLoading: linksLoading } = useGroupedFooterLinks();

  // Dados dinâmicos da marca
  const brandName = brand?.name || brandConfig.name || 'Sesh Store';
  const displayName = brandName.split(' ')[0].toUpperCase();
  const logoUrl = brand?.theme?.logo || brandConfig.theme.logo;

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 3000);
    }
  };

  // Footer links dinâmicos do banco (sem fallback hardcoded)
  const footerLinkSections = (!linksLoading && dbFooterLinks && Object.keys(dbFooterLinks).length > 0) ? dbFooterLinks : {};

  // Social icons dinâmicos do brand.settings
  const socialConfig = (brand?.settings as Record<string, any>)?.social || {};
  const socialIcons = [
    { Icon: Instagram, label: 'Instagram', href: socialConfig.instagram || '#' },
    { Icon: Facebook, label: 'Facebook', href: socialConfig.facebook || '#' },
    { Icon: Youtube, label: 'YouTube', href: socialConfig.youtube || '#' },
    { Icon: Twitter, label: 'Twitter', href: socialConfig.twitter || '#' },
  ].filter(s => s.href !== '#');

  return (
    <footer className="relative bg-gradient-to-b from-gray-900 via-black to-black text-white overflow-hidden">
      {/* Grain texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />

      {/* Decorative top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${primaryColor}40, transparent)`
        }}
      />

      <div className="container mx-auto px-6 md:px-8 lg:px-12 relative z-10">

        {/* Accent line separator */}
        <div className="pt-16 pb-4">
          <div
            className="h-[2px] w-16"
            style={{ backgroundColor: primaryColor }}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 pt-8 pb-16">
          {/* Brand Column */}
          <div className="space-y-6 lg:col-span-1">
            {logoUrl && !logoUrl.includes('default') ? (
              <img src={logoUrl} alt={brandName} className="h-14 brightness-110" />
            ) : (
              <div
                className="font-sans text-4xl font-black tracking-tighter"
                style={{ color: primaryColor }}
              >
                {displayName}
              </div>
            )}
            {(brand?.settings as Record<string, any>)?.description && (
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                {(brand.settings as Record<string, any>).description}
              </p>
            )}

            {/* Social Icons — sharp editorial squares */}
            <div className="flex gap-2.5 pt-2">
              {socialIcons.map(({ Icon, label, href }, i) => (
                <motion.a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative w-10 h-10 flex items-center justify-center rounded-sm bg-transparent border border-gray-700/60 transition-all duration-300"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = primaryColor;
                    e.currentTarget.style.backgroundColor = `${primaryColor}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(55 65 81 / 0.6)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Icon size={16} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Dynamic Footer Link Sections */}
          {Object.entries(footerLinkSections).map(([sectionName, links]) => (
            <div key={sectionName}>
              <h4 className="font-bold text-xs uppercase tracking-[0.2em] mb-3 text-white/90">
                {sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}
              </h4>
              <div
                className="w-8 h-[2px] mb-6"
                style={{ backgroundColor: primaryColor }}
              />
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.id}>
                    {link.is_external ? (
                      <a
                        href={link.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 inline-flex items-center gap-2 group"
                      >
                        <span
                          className="w-0 h-px transition-all duration-200 group-hover:w-4"
                          style={{ backgroundColor: primaryColor }}
                        />
                        {link.label}
                      </a>
                    ) : (
                      <BrandLink
                        to={link.url || '#'}
                        className="text-sm text-gray-400 hover:text-white transition-colors duration-200 inline-flex items-center gap-2 group"
                      >
                        <span
                          className="w-0 h-px transition-all duration-200 group-hover:w-4"
                          style={{ backgroundColor: primaryColor }}
                        />
                        {link.label}
                      </BrandLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter Column */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-[0.2em] mb-3 text-white/90">
              Newsletter
            </h4>
            <div
              className="w-8 h-[2px] mb-6"
              style={{ backgroundColor: primaryColor }}
            />
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              Receba drops exclusivos, lançamentos e ofertas especiais.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-gray-900/80 border-0 border-b-2 border-gray-700 text-white px-4 py-3 rounded-none text-sm focus:outline-none transition-colors placeholder:text-gray-600"
                  style={{
                    borderBottomColor: subscribed ? primaryColor : undefined
                  }}
                  disabled={subscribed}
                />
                {subscribed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle size={20} style={{ color: primaryColor }} />
                  </motion.div>
                )}
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={subscribed}
                className={`w-full py-3 px-4 rounded-none font-bold text-xs tracking-[0.2em] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  subscribed
                    ? 'text-white border-0'
                    : 'text-white border border-white/30 bg-transparent hover:bg-white hover:text-black'
                }`}
                style={subscribed ? { backgroundColor: '#10b981' } : {}}
              >
                {subscribed ? 'Inscrito com sucesso!' : 'INSCREVER'}
              </motion.button>
            </form>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Copyright */}
            <p className="text-[10px] text-gray-600 tracking-[0.15em] uppercase">
              &copy; {new Date().getFullYear()} {brandName.toUpperCase()}. Todos os direitos reservados.
            </p>

            {/* Payment Methods — flat editorial */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 text-gray-500">
                <CreditCard size={16} />
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Cartão</span>
              </div>
              <div className="w-px h-3 bg-gray-800" />
              <span
                className="text-[10px] font-bold tracking-[0.15em] uppercase"
                style={{ color: primaryColor }}
              >
                Pix
              </span>
              <div className="w-px h-3 bg-gray-800" />
              <div className="flex items-center gap-1.5 text-gray-500">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Seguro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- Cart Page ---

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const { primaryColor } = useBrandColors();

  // Usar cartStore para ter acesso ao shipping e cupons
  const {
    shipping,
    shippingCost,
    setShipping,
    cartSubtotal,
    finalTotal,
    coupon,
    discountAmount,
    applyCoupon,
    removeCoupon
  } = useCartStore();

  const subtotal = cartSubtotal || cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discountAmount) + shippingCost;

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 animate-fade-in">
        <div className="max-w-md mx-auto text-center">
          {/* Empty State Icon */}
          <div className="mb-8 relative">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center relative overflow-hidden">
              <ShoppingBag size={56} className="text-gray-400 relative z-10" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />
            </div>
            {/* Decorative circles */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full -z-10 animate-pulse"
              style={{ backgroundColor: `${primaryColor}10` }}
            />
          </div>

          {/* Empty State Text */}
          <h1 className="font-sans text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Sua sacola está vazia
          </h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Explore nossa coleção e adicione produtos incríveis à sua sacola.
          </p>

          {/* CTA Button */}
          <Button
            onClick={() => navigate('/shop')}
            className="group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              Explorar produtos
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-fade-in">
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <h1 className="font-sans text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Sua sacola
        </h1>
        <p className="text-gray-500 text-sm">
          {cart.reduce((acc, i) => acc + i.quantity, 0)} {cart.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'item' : 'itens'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Cart Items List */}
        <div className="flex-1 space-y-6">
          {cart.map((item, idx) => (
            <div
              key={`${item.id}-${item.selectedSize}-${item.selectedColor}-${idx}`}
              className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="flex gap-4 sm:gap-6 p-4 sm:p-6">
                {/* Product Image */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  <img
                    src={item.images[0]}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  {/* Top Section */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg mb-2 leading-tight tracking-tight">
                        {item.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {item.selectedColor}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {item.selectedSize}
                        </span>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                      aria-label="Remover item"
                    >
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  </div>

                  {/* Bottom Section */}
                  <div className="flex justify-between items-end mt-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                      <button
                        className="px-3 sm:px-4 py-2 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50"
                        onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, -1)}
                        disabled={item.quantity <= 1}
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={16} strokeWidth={2.5} />
                      </button>
                      <span className="px-4 sm:px-6 font-bold text-sm sm:text-base min-w-[40px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        className="px-3 sm:px-4 py-2 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, 1)}
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="font-bold text-lg sm:text-xl tracking-tight">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hover accent line */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"
                style={{
                  background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}80)`
                }}
              />
            </div>
          ))}

          {/* Clear Cart Button */}
          <button
            onClick={clearCart}
            className="text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center gap-2 group mt-4"
          >
            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
            Limpar sacola
          </button>
        </div>

        {/* Summary & Shipping - Sticky Sidebar */}
        <div className="w-full lg:w-[420px]">
          <div className="lg:sticky lg:top-24 space-y-6">
            {/* Order Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/50 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white px-6 sm:px-8 py-6 border-b border-gray-200">
                <h2 className="font-bold text-xl tracking-tight">Resumo do pedido</h2>
              </div>

              {/* Content */}
              <div className="px-6 sm:px-8 py-6 space-y-6">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    Subtotal ({cart.reduce((acc, i) => acc + i.quantity, 0)} {cart.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'item' : 'itens'})
                  </span>
                  <span className="font-bold text-lg">R$ {subtotal.toFixed(2)}</span>
                </div>

                {/* Shipping Info */}
                {shipping && (
                  <div className="flex justify-between items-start py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-sm">{shipping.ServiceDescription}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Package size={12} />
                        {shipping.DeliveryTime} dias úteis
                      </span>
                    </div>
                    <span className="font-bold text-sm">
                      {shippingCost === 0 ? (
                        <span className="text-green-600">GRÁTIS</span>
                      ) : (
                        `R$ ${shippingCost.toFixed(2)}`
                      )}
                    </span>
                  </div>
                )}

                {/* Free Shipping Progress */}
                <div>
                  <FreeShippingProgress cartSubtotal={subtotal} />
                </div>

                {/* Shipping Calculator */}
                <div className="border-t border-gray-200 pt-6">
                  <ShippingCalculator
                    cartTotal={subtotal}
                    onShippingSelected={(service) => {
                      setShipping(service);
                    }}
                  />
                </div>

                {/* Coupon Input */}
                <div className="border-t border-gray-200 pt-6">
                  <CouponInput
                    cartTotal={subtotal}
                    onCouponApplied={(discount, code) => applyCoupon(code, discount)}
                    onCouponRemoved={() => removeCoupon()}
                  />
                </div>

                {/* Discount Applied */}
                {coupon && discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                    <span className="text-sm font-medium">Desconto ({coupon.code})</span>
                    <span className="font-bold">- R$ {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="border-t-2 border-gray-900 pt-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xl font-bold tracking-tight">Total</span>
                    <span className="text-2xl font-bold tracking-tight">R$ {total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-right">Em até 12x sem juros</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-3">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => navigate('/checkout')}
                  className="group relative overflow-hidden h-12 font-bold tracking-wide"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Finalizar pedido
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => navigate('/shop')}
                  className="h-12 font-medium"
                >
                  Continuar comprando
                </Button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <ShieldCheck size={24} className="mx-auto mb-1 text-green-600" strokeWidth={1.5} />
                <p className="text-xs text-gray-600 leading-tight">Compra segura</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <Truck size={24} className="mx-auto mb-1 text-blue-600" strokeWidth={1.5} />
                <p className="text-xs text-gray-600 leading-tight">Frete rápido</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <CreditCard size={24} className="mx-auto mb-1 text-purple-600" strokeWidth={1.5} />
                <p className="text-xs text-gray-600 leading-tight">Até 12x s/ juros</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- New Pages: Checkout & Institutional ---

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<BillingType>('CREDIT_CARD');
  const { brandConfig, currentSlug } = useBrand();

  // Usar cartStore ao invés de useCart para ter acesso ao shipping
  const {
    cart,
    clearCart,
    cartSubtotal,
    shipping,
    shippingCost,
    discountAmount,
    setShipping
  } = useCartStore();

  const subtotal = cartSubtotal || cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discountAmount) + shippingCost;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setPaymentError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const result = await createAsaasPayment({
        customer: {
          name: data.get('name') as string,
          email: data.get('email') as string,
          cpfCnpj: data.get('cpf') as string,
          phone: data.get('phone') as string,
        },
        value: total,
        billingType,
        description: `Pedido ${brandConfig.name} - ${cart.length} item(s)`,
        brandSlug: currentSlug,
      });

      if (result.invoiceUrl) {
        window.open(result.invoiceUrl, '_blank');
      }

      setSuccess(true);
      clearCart();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (cart.length === 0 && !success) {
    return (
      <div className="container mx-auto px-4 py-20 text-center animate-fade-in">
        <h1 className="font-sans text-4xl mb-4">SEU CARRINHO ESTÁ VAZIO</h1>
        <p className="text-gray-500 mb-8">Adicione produtos antes de finalizar a compra.</p>
        <Button onClick={() => navigate('/shop')}>VOLTAR PARA A LOJA</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h1 className="font-sans text-4xl mb-4 text-sesh-cyan">PEDIDO CONFIRMADO!</h1>
        <p className="text-xl font-bold mb-2">Obrigado pela sua compra.</p>
        <p className="text-gray-500 mb-8">Você receberá um e-mail com os detalhes do rastreamento.</p>
        <Button onClick={() => navigate('/')}>VOLTAR PARA HOME</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <h1 className="font-sans text-3xl mb-8">FINALIZAR <span className="text-sesh-cyan">COMPRA</span></h1>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-8">
          <form id="checkout-form" onSubmit={handleSubmit}>
            {/* Identification */}
            <section className="bg-white p-6 border rounded mb-6">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-4 border-b pb-2">
                <User size={20} /> DADOS PESSOAIS
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input required name="email" type="email" placeholder="E-mail" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                <input required name="name" type="text" placeholder="Nome Completo" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                <input required name="cpf" type="text" placeholder="CPF" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                <input name="phone" type="tel" placeholder="Telefone" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
              </div>
            </section>

            {/* Address */}
            <section className="bg-white p-6 border rounded mb-6">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-4 border-b pb-2">
                <MapPin size={20} /> ENTREGA
              </h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <input required type="text" placeholder="CEP" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                <div className="md:col-span-2 grid grid-cols-[1fr_100px] gap-4">
                   <input required type="text" placeholder="Rua" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                   <input required type="text" placeholder="Número" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                </div>
                <input type="text" placeholder="Complemento" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                <input required type="text" placeholder="Bairro" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                <input required type="text" placeholder="Cidade" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                <input required type="text" placeholder="Estado" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
              </div>

              {/* Cálculo de Frete */}
              <div className="border-t pt-6 mt-6">
                <ShippingCalculator
                  cartTotal={subtotal}
                  onShippingSelected={(service) => {
                    setShipping(service);
                  }}
                />
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white p-6 border rounded">
              <h2 className="flex items-center gap-2 font-bold text-lg mb-4 border-b pb-2">
                <CreditCard size={20} /> PAGAMENTO
              </h2>
              
              <div className="flex gap-4 mb-6">
                <label className="flex-1 cursor-pointer" onClick={() => setBillingType('CREDIT_CARD')}>
                  <input type="radio" name="billingType" className="peer sr-only" defaultChecked />
                  <div className={`text-center p-4 border-2 rounded transition-all ${billingType === 'CREDIT_CARD' ? 'border-sesh-cyan bg-sesh-cyan/5' : ''}`}>
                    <CreditCard className="mx-auto mb-2" />
                    <span className="font-bold text-sm">CARTÃO</span>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer" onClick={() => setBillingType('PIX')}>
                  <input type="radio" name="billingType" className="peer sr-only" />
                  <div className={`text-center p-4 border-2 rounded transition-all ${billingType === 'PIX' ? 'border-sesh-cyan bg-sesh-cyan/5' : ''}`}>
                    <span className="font-sans text-xl block mb-1">PIX</span>
                    <span className="font-bold text-sm">10% OFF</span>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer" onClick={() => setBillingType('BOLETO')}>
                  <input type="radio" name="billingType" className="peer sr-only" />
                  <div className={`text-center p-4 border-2 rounded transition-all ${billingType === 'BOLETO' ? 'border-sesh-cyan bg-sesh-cyan/5' : ''}`}>
                    <Package className="mx-auto mb-2" />
                    <span className="font-bold text-sm">BOLETO</span>
                  </div>
                </label>
              </div>

              {billingType === 'CREDIT_CARD' && (
                <div className="space-y-4">
                  <input type="text" placeholder="Número do Cartão" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                  <input type="text" placeholder="Nome Impresso no Cartão" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Validade (MM/AA)" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                    <input type="text" placeholder="CVV" className="border p-3 rounded w-full focus:outline-none focus:ring-1 focus:ring-black" />
                  </div>
                </div>
              )}

              {billingType === 'PIX' && (
                <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
                  Após confirmar, você será redirecionado para a página de pagamento com o QR Code PIX.
                </div>
              )}

              {billingType === 'BOLETO' && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
                  Após confirmar, você será redirecionado para a página do boleto. Prazo de vencimento: 1 dia útil.
                </div>
              )}

              {paymentError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700">
                  {paymentError}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
                <Lock size={12} /> Pagamento processado com segurança via Asaas
              </div>
            </section>
          </form>
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-6 rounded sticky top-24">
            <h2 className="font-bold text-lg mb-6">RESUMO DO PEDIDO</h2>
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
              {cart.map((item, idx) => (
                <div key={idx} className="flex gap-3 text-sm">
                  <img src={item.images[0]} alt={item.name} className="w-12 h-12 object-cover bg-white" />
                  <div>
                    <p className="font-bold line-clamp-1">{item.name}</p>
                    <p className="text-gray-500">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{item.selectedSize} / {item.selectedColor}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {shipping ? (
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span>Frete ({shipping.ServiceDescription})</span>
                    <span className="text-xs text-gray-500">{shipping.DeliveryTime} dias úteis</span>
                  </div>
                  <span>R$ {shippingCost.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-gray-500">
                  <span>Frete</span>
                  <span>Calcular</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                <span>TOTAL</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <Button type="submit" form="checkout-form" fullWidth disabled={isLoading} className="mt-6 py-4 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1">
              {isLoading ? 'PROCESSANDO...' : 'PAGAR AGORA'}
            </Button>
            <p className="text-center text-xs text-gray-400 mt-4">
              Ao finalizar a compra você concorda com nossos termos de uso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// AboutPage removido — usar StaticPageRenderer via /page/sobre-nos

// --- Pages ---

const HomePage = () => {
  const { brand, brandConfig, isLoading: brandLoading } = useBrand();
  const { primaryColor } = useBrandColors();
  const { user } = useAuth();
  const { data: heroCollection } = useHeroCollection();
  const { data: featuredProducts } = useFeaturedProducts();
  const navigate = useNavigate();
  const { data: tabacariaCategories, isLoading: tabacariaLoading } = useTabacariaCategories();
  const { data: banners } = useBanners();

  // Filtrar destaques com reatividade ao login
  const visibleFeaturedProducts = useMemo(() => {
    return (featuredProducts || []).filter((product: any) => !product.is_tabaco || user);
  }, [featuredProducts, user]);

  // Aplicar tema dinâmico
  useApplyBrandTheme();

  // Preload banner images para não travar ao revelar com scroll
  React.useEffect(() => {
    if (banners && banners.length > 0) {
      banners.forEach((banner) => {
        if (banner.image_url) {
          const img = new Image();
          img.src = banner.image_url;
        }
        if (banner.mobile_image_url) {
          const img = new Image();
          img.src = banner.mobile_image_url;
        }
      });
    }
  }, [banners]);

  // Loading geral - só mostra loading se a marca ainda não carregou de nenhuma forma
  const isLoading = brandLoading && !brand && !brandConfig;

  // Dados dinâmicos da marca
  const brandName = brand?.name || brandConfig.name || 'Sesh Store';
  const displayName = brandName.split(' ')[0].toUpperCase();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: primaryColor }}
          ></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <main>
      {/* 1. Hero Banner - Streetwear Editorial with Parallax */}
      {heroCollection && (
        <section className="relative h-[600px] md:h-[700px] lg:h-[90vh] w-full overflow-hidden bg-black">
          {/* Parallax Background - Desktop */}
          <ParallaxImage
            src={heroCollection.image_url || ''}
            alt={heroCollection.name || "Hero"}
            className="absolute inset-0 w-full h-full object-cover opacity-50 hidden md:block"
            speed={0.3}
          />
          {/* Parallax Background - Mobile */}
          <ParallaxImage
            src={heroCollection.mobile_image_url || heroCollection.image_url || ''}
            alt={heroCollection.name || "Hero"}
            className="absolute inset-0 w-full h-full object-cover opacity-50 md:hidden"
            speed={0.15}
          />

          {/* Grain overlay for texture */}
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none z-[1]" />

          {/* Gradient overlay - bottom fade for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-[2]" />

          {/* Content - Editorial layout, bottom-left aligned */}
          <div className="absolute inset-0 flex flex-col justify-end items-start p-8 md:p-16 lg:p-24 z-[3]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15, delayChildren: 0.3 },
                },
              }}
              className="max-w-3xl"
            >
              {/* Accent line */}
              <motion.div
                variants={{
                  hidden: { scaleX: 0, originX: 0 },
                  visible: { scaleX: 1, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
                }}
                className="w-16 h-1 mb-6 origin-left"
                style={{ backgroundColor: primaryColor }}
              />

              {/* Collection name - massive editorial type */}
              <motion.h1
                variants={{
                  hidden: { opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0)' },
                  visible: {
                    opacity: 1,
                    y: 0,
                    clipPath: 'inset(0 0 0% 0)',
                    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
                  },
                }}
                className="font-sans text-5xl md:text-7xl lg:text-8xl xl:text-9xl text-white font-black uppercase leading-[0.9] tracking-tight mb-4"
              >
                {heroCollection.name}
              </motion.h1>

              {/* Description */}
              {heroCollection.description && (
                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, ease: 'easeOut' },
                    },
                  }}
                  className="text-white/80 text-base md:text-lg font-medium tracking-widest uppercase mb-8 max-w-xl"
                >
                  {heroCollection.description}
                </motion.p>
              )}

              {/* CTA Button */}
              {heroCollection.show_button && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6, ease: 'easeOut' },
                    },
                  }}
                >
                  <BrandLink to={heroCollection.redirect_url || `/shop?collection=${heroCollection.slug}`}>
                    <button
                      className="group font-bold uppercase tracking-widest px-10 py-4 text-sm text-white border-2 border-white bg-transparent transition-all duration-300 hover:bg-white hover:text-black"
                    >
                      {heroCollection.button_text || "VER COLEÇÃO"}
                      <ArrowRight className="inline-block ml-3 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </BrandLink>
                </motion.div>
              )}
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="absolute bottom-8 right-8 md:right-16 hidden md:flex flex-col items-center gap-2"
            >
              <span className="text-white/40 text-[10px] tracking-[0.3em] uppercase rotate-90 origin-center">Scroll</span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[1px] h-8 bg-white/30"
              />
            </motion.div>
          </div>
        </section>
      )}

      {/* 2. Faixa Promocional Marquee */}
      <ScrollReveal direction="none" duration={0.5}>
        <MarqueeBanner
          items={[
            { text: "DROPS EXCLUSIVOS & COLLABS ICÔNICAS", icon: "sparkles" },
            { text: "FRETE GRÁTIS ACIMA DE R$200", icon: "truck" },
            { text: "PARCELE EM ATÉ 6X SEM JUROS", icon: "credit-card" },
          ]}
          bgColor="#B91C1C"
          textColor="#FFFFFF"
        />
      </ScrollReveal>

      {/* 3. Seção DESTAQUES - Editorial Product Grid */}
      {visibleFeaturedProducts && visibleFeaturedProducts.length > 0 && (
        <section id="destaques" className="py-20 md:py-28 bg-white relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 text-[200px] md:text-[300px] font-black text-gray-50 leading-none select-none pointer-events-none -translate-y-1/4 translate-x-1/4">
            DROP
          </div>

          <div className="container mx-auto px-6 md:px-8 lg:px-12 relative z-10">
            <ScrollReveal direction="up" distance={40} duration={0.7}>
              <div className="flex flex-col items-center mb-12 md:mb-16">
                <div className="w-12 h-[2px] mb-6" style={{ backgroundColor: primaryColor }} />
                <h2 className="font-sans text-4xl md:text-5xl lg:text-6xl font-black text-center uppercase tracking-tight">
                  DESTAQUES
                </h2>
                <p className="text-gray-400 text-sm tracking-[0.3em] uppercase mt-3">Seleção curada</p>
              </div>
            </ScrollReveal>

            <StaggerContainer
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
              staggerDelay={0.1}
            >
              {visibleFeaturedProducts.map((product: any) => {
                const images = product.product_images
                  ? product.product_images
                      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                      .map((img: any) => img.url)
                  : product.images || [];
                const colors = product.product_variants
                  ? [...new Set(product.product_variants.map((v: any) => v.color_hex || v.color).filter(Boolean))]
                  : product.colors || [];
                const sizes = product.product_variants
                  ? [...new Set(product.product_variants.map((v: any) => v.size).filter(Boolean))]
                  : product.sizes || [];
                const stock = product.product_variants
                  ? product.product_variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
                  : product.stock || 0;
                const normalized = {
                  ...product,
                  images,
                  colors,
                  sizes,
                  stock,
                  originalPrice: product.compare_at_price || product.original_price,
                  rating: product.rating || 0,
                  reviews: product.reviews || 0,
                };
                return (
                  <StaggerItem key={product.id}>
                    <ProductCard
                      product={normalized}
                      onView={(p) => navigate(`/product/${p.id}`)}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* 5. Banners Dinâmicos do Banco - Scroll Reveal com imagens pré-carregadas */}
      {banners && banners.length > 0 && banners.map((banner) => (
        <ScrollReveal key={banner.id} direction="up" distance={60} duration={0.7} threshold={0.1}>
          <section className="relative w-full overflow-hidden">
            {banner.cta_link ? (
              <BrandLink to={banner.cta_link} className="block">
                <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px]">
                  {/* Desktop image */}
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="absolute inset-0 w-full h-full object-cover hidden md:block"
                    loading="eager"
                  />
                  {/* Mobile image (fallback to desktop) */}
                  <img
                    src={banner.mobile_image_url || banner.image_url}
                    alt={banner.title}
                    className="absolute inset-0 w-full h-full object-cover md:hidden"
                    loading="eager"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Content overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end items-start p-8 md:p-16 lg:p-24">
                    {banner.subtitle && (
                      <span className="text-white/60 text-xs md:text-sm tracking-[0.3em] uppercase font-medium mb-2">
                        {banner.subtitle}
                      </span>
                    )}
                    <h2 className="font-sans text-3xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-[0.95] mb-3">
                      {banner.title}
                    </h2>
                    {banner.description && (
                      <p className="text-white/70 text-sm md:text-base max-w-xl mb-4">
                        {banner.description}
                      </p>
                    )}
                    {banner.cta_text && (
                      <span className="group inline-flex items-center font-bold uppercase tracking-widest text-xs md:text-sm text-white border-b-2 border-white/40 pb-1 transition-all duration-300 hover:border-white">
                        {banner.cta_text}
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                  </div>
                </div>
              </BrandLink>
            ) : (
              <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px]">
                {/* Desktop image */}
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover hidden md:block"
                  loading="eager"
                />
                {/* Mobile image (fallback to desktop) */}
                <img
                  src={banner.mobile_image_url || banner.image_url}
                  alt={banner.title}
                  className="absolute inset-0 w-full h-full object-cover md:hidden"
                  loading="eager"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Content overlay */}
                <div className="absolute inset-0 flex flex-col justify-end items-start p-8 md:p-16 lg:p-24">
                  {banner.subtitle && (
                    <span className="text-white/60 text-xs md:text-sm tracking-[0.3em] uppercase font-medium mb-2">
                      {banner.subtitle}
                    </span>
                  )}
                  <h2 className="font-sans text-3xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-[0.95] mb-3">
                    {banner.title}
                  </h2>
                  {banner.description && (
                    <p className="text-white/70 text-sm md:text-base max-w-xl">
                      {banner.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </ScrollReveal>
      ))}

      {/* 6. Seção TABACARIA - Produtos com tabs de categoria */}
      {tabacariaCategories && tabacariaCategories.length > 0 && (
        <ScrollReveal direction="up" distance={50}>
          <ProductSectionWithTabs
            title="TABACARIA"
            categories={tabacariaCategories}
            showAllOption={false}
            maxProducts={4}
            sectionId="tabacaria"
            bgColor="#FAFAFA"
          />
        </ScrollReveal>
      )}

      {/* 7. Quem Somos - Editorial Streetwear (scroll-triggered) */}
      <ScrollReveal direction="up" distance={50} duration={0.7} threshold={0.2}>
        <section className="relative bg-white py-24 md:py-32 overflow-hidden">
          {/* Giant background text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-[120px] md:text-[200px] lg:text-[280px] font-black text-gray-50 uppercase leading-none">
              VIBES
            </span>
          </div>

          <div className="container mx-auto px-6 md:px-8 relative z-10">
            <div className="max-w-4xl mx-auto">
              <ScrollReveal direction="up" distance={40}>
                <div className="text-center mb-8">
                  <div className="w-12 h-[2px] mx-auto mb-6" style={{ backgroundColor: primaryColor }} />
                  <h2 className="font-sans text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight">
                    {displayName} <span style={{ color: primaryColor }}>VIBES</span>
                  </h2>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.2} distance={30}>
                <p className="text-gray-500 leading-relaxed text-lg md:text-xl text-center max-w-2xl mx-auto mb-12">
                  Nascida nas ruas, criada para o mundo. A {displayName} não é apenas uma marca de roupas, é um movimento.
                  Representamos a autenticidade do skate, a liberdade do graffiti e a força da comunidade urbana.
                </p>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.3}>
                <div className="text-center">
                  <BrandLink to="/about">
                    <button
                      className="group font-bold uppercase tracking-widest px-10 py-4 text-sm border-2 border-black bg-transparent text-black transition-all duration-300 hover:bg-black hover:text-white"
                    >
                      CONHEÇA NOSSA HISTÓRIA
                      <ArrowRight className="inline-block ml-3 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </BrandLink>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* 8. FAQ Section */}
      <ScrollReveal direction="up" distance={40}>
        <FAQSection />
      </ScrollReveal>
    </main>
  );
};

const ProductListPage = () => {
  const location = useLocation();
  const { primaryColor } = useBrandColors();
  const { brand } = useBrand();
  const { user } = useAuth();
  const { searchQuery, clearSearch } = useSearch();

  // Extrair parâmetros da URL
  const searchParams = new URLSearchParams(location.search);
  const categorySlug = searchParams.get('category');
  const collectionSlug = searchParams.get('collection');

  // Buscar produtos do banco de dados
  const { data: allProducts, isLoading: loadingAll } = useProducts();
  const { data: categoryProducts, isLoading: loadingCategory } = useProductsByCategorySlug(categorySlug || '');
  const { data: collectionProducts, isLoading: loadingCollection } = useProductsByCollectionSlug(collectionSlug || '');
  const { data: categories } = useCategoryTree(); // Hierárquico para sidebar

  // Busca fuzzy (só quando houver query)
  const { products: searchResults, isLoading: loadingSearch, isSearching } = useFuzzySearch(searchQuery);

  const [filterState, setFilterState] = useState<FilterState>({
    color: [],
    size: [],
    priceRange: null,
    sort: 'relevance'
  });
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Pending filter selections (applied only on "Aplicar Filtros")
  const [pendingColors, setPendingColors] = useState<string[]>([]);
  const [pendingSizes, setPendingSizes] = useState<string[]>([]);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Usar produtos da busca se estiver buscando, senão usa coleção, categoria ou todos
  const baseProducts = isSearching
    ? searchResults
    : (collectionSlug ? (collectionProducts || []) : (categorySlug ? (categoryProducts || []) : (allProducts || [])));
  const isLoading = isSearching ? loadingSearch : (collectionSlug ? loadingCollection : (categorySlug ? loadingCategory : loadingAll));

  // Cores com hex real das variantes
  const availableColors = [...new Map(
    baseProducts.flatMap((p: any) =>
      (p.product_variants || [])
        .filter((v: any) => v.color)
        .map((v: any) => ({ name: v.color, hex: v.color_hex }))
    ).map((c: any) => [c.name, c])
  ).values()];

  // Tamanhos únicos das variantes
  const availableSizes = [...new Set(
    baseProducts.flatMap((p: any) =>
      (p.product_variants || []).map((v: any) => v.size).filter(Boolean)
    )
  )];

  // Faixa de preço real dos produtos
  const allPrices = baseProducts.map((p: any) => {
    const variantPrices = (p.product_variants || [])
      .map((v: any) => Number(v.price || p.price))
      .filter((n: number) => n > 0);
    return variantPrices.length > 0 ? Math.min(...variantPrices) : Number(p.price);
  }).filter((n: number) => n > 0);
  const minPriceAvailable = allPrices.length > 0 ? Math.floor(Math.min(...allPrices)) : 0;
  const maxPriceAvailable = allPrices.length > 0 ? Math.ceil(Math.max(...allPrices)) : 9999;

  // Aplicar filtros (reativo ao login via useMemo)
  const filteredProducts = useMemo(() => baseProducts.filter((p: any) => {
    // Filtro de tabaco: só mostra se o usuário estiver logado
    if (p.is_tabaco && !user) return false;

    // Filtro por cor
    if (filterState.color.length > 0) {
      const productColors = (p.product_variants || []).map((v: any) => v.color).filter(Boolean);
      if (!productColors.some((c: string) => filterState.color.includes(c))) return false;
    }

    // Filtro por tamanho
    if (filterState.size.length > 0) {
      const productSizes = (p.product_variants || []).map((v: any) => v.size).filter(Boolean);
      if (!productSizes.some((s: string) => filterState.size.includes(s))) return false;
    }

    // Filtro por preço
    if (filterState.priceRange) {
      const [minP, maxP] = filterState.priceRange;
      const variantPrices = (p.product_variants || [])
        .map((v: any) => Number(v.price || p.price))
        .filter((n: number) => n > 0);
      const productMinPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : Number(p.price);
      if (productMinPrice < minP || productMinPrice > maxP) return false;
    }

    return true;
  }), [baseProducts, user, filterState]);

  // Ordenação
  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    if (filterState.sort === 'price_asc') return Number(a.price) - Number(b.price);
    if (filterState.sort === 'price_desc') return Number(b.price) - Number(a.price);
    return 0; // relevance = ordem original
  });

  const togglePendingFilter = (type: 'color' | 'size', value: string) => {
    if (type === 'color') {
      setPendingColors(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    } else {
      setPendingSizes(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    }
  };

  const applyFilters = () => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    setFilterState(prev => ({
      ...prev,
      color: [...pendingColors],
      size: [...pendingSizes],
      priceRange: min !== null || max !== null ? [min ?? minPriceAvailable, max ?? maxPriceAvailable] : null
    }));
  };

  const clearFilters = () => {
    setPendingColors([]);
    setPendingSizes([]);
    setPriceMin('');
    setPriceMax('');
    setFilterState(prev => ({
      ...prev,
      color: [],
      size: [],
      priceRange: null
    }));
  };

  // Busca recursiva de categoria na árvore (suporta subcategorias)
  const findCategoryInTree = (cats: Category[], slug: string): Category | undefined => {
    for (const cat of cats) {
      if (cat.slug === slug) return cat;
      if (cat.children && cat.children.length > 0) {
        const found = findCategoryInTree(cat.children, slug);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Título dinâmico
  const currentCategory = categorySlug ? findCategoryInTree(categories || [], categorySlug) : undefined;
  const pageTitle = isSearching
    ? `Resultados para "${searchQuery}"`
    : (collectionSlug
      ? collectionSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : (currentCategory?.name || 'PRODUTOS'));

  if (isLoading) {
    return <ShopPageSkeleton />;
  }

  return (
    <div className="container mx-auto px-6 md:px-8 lg:px-12 py-8 md:py-10">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

        {/* Sidebar Filters (Desktop) - Premium */}
        <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0 space-y-8">
          {/* Categorias - Premium */}
          {categories && categories.length > 0 && (
            <div className="pb-8 border-b border-gray-100">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-5 text-gray-900">Categorias</h3>
              <div className="space-y-3">
                <BrandLink
                  to="/shop"
                  className={`block text-sm transition-all duration-200 group relative ${!categorySlug ? 'font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                  style={!categorySlug ? { color: primaryColor } : {}}
                >
                  <span className="relative">
                    Todos os Produtos
                    <span
                      className={`absolute bottom-0 left-0 h-0.5 transition-all duration-200 ${!categorySlug ? 'w-full' : 'w-0 group-hover:w-full'}`}
                      style={!categorySlug ? { backgroundColor: primaryColor } : { backgroundColor: '#e5e7eb' }}
                    />
                  </span>
                </BrandLink>
                {categories.map((cat: Category) => (
                  <div key={cat.id}>
                    <BrandLink
                      to={`/shop?category=${cat.slug}`}
                      className={`block text-sm transition-all duration-200 group relative ${categorySlug === cat.slug ? 'font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                      style={categorySlug === cat.slug ? { color: primaryColor } : {}}
                    >
                      <span className="relative">
                        {cat.name}
                        <span
                          className={`absolute bottom-0 left-0 h-0.5 transition-all duration-200 ${categorySlug === cat.slug ? 'w-full' : 'w-0 group-hover:w-full'}`}
                          style={categorySlug === cat.slug ? { backgroundColor: primaryColor } : { backgroundColor: '#e5e7eb' }}
                        />
                      </span>
                    </BrandLink>
                    {/* Subcategorias */}
                    {cat.children && cat.children.length > 0 && (
                      <div className="pl-4 mt-2 space-y-2 border-l-2 border-gray-100 ml-2">
                        {cat.children.map((sub: Category) => (
                          <BrandLink
                            key={sub.id}
                            to={`/shop?category=${sub.slug}`}
                            className={`block text-xs transition-all duration-200 group relative ${categorySlug === sub.slug ? 'font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
                            style={categorySlug === sub.slug ? { color: primaryColor } : {}}
                          >
                            <span className="relative">
                              {sub.name}
                              <span
                                className={`absolute bottom-0 left-0 h-0.5 transition-all duration-200 ${categorySlug === sub.slug ? 'w-full' : 'w-0 group-hover:w-full'}`}
                                style={categorySlug === sub.slug ? { backgroundColor: primaryColor } : { backgroundColor: '#e5e7eb' }}
                              />
                            </span>
                          </BrandLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preço */}
          {allPrices.length > 0 && (
            <div className="pb-8 border-b border-gray-100">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-5 text-gray-900">Preço</h3>
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  R$ {minPriceAvailable.toLocaleString('pt-BR')} — R$ {maxPriceAvailable.toLocaleString('pt-BR')}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Mín"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none w-0"
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                  <span className="text-gray-400 font-medium text-sm flex-shrink-0">–</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Máx"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none w-0"
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cores - Swatches com hex real do banco */}
          {availableColors.length > 0 && (
            <div className="pb-8 border-b border-gray-100">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-5 text-gray-900">Cores</h3>
              <div className="flex flex-wrap gap-3">
                {availableColors.map((colorObj: any) => (
                  <button
                    key={colorObj.name}
                    onClick={() => togglePendingFilter('color', colorObj.name)}
                    className={`w-10 h-10 rounded-full border-2 relative transition-all duration-200 hover:scale-110 active:scale-95 ${pendingColors.includes(colorObj.name) ? 'shadow-md border-transparent' : 'border-gray-200 hover:border-gray-300'}`}
                    style={{
                      backgroundColor: colorObj.hex || '#cccccc',
                      ...(pendingColors.includes(colorObj.name) && { outline: `3px solid ${primaryColor}`, outlineOffset: '2px' })
                    }}
                    title={colorObj.name}
                    aria-label={`Filtrar por cor: ${colorObj.name}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tamanhos - Premium Buttons */}
          {availableSizes.length > 0 && (
            <div className="pb-8 border-b border-gray-100">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-5 text-gray-900">Tamanho</h3>
              <div className="grid grid-cols-3 gap-2">
                {availableSizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => togglePendingFilter('size', size)}
                    className={`py-3 text-sm font-bold border-2 rounded transition-all duration-200 hover:scale-105 active:scale-95 ${pendingSizes.includes(size) ? 'text-white shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
                    style={pendingSizes.includes(size) ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botões Aplicar / Limpar Filtros */}
          <div className="space-y-3 pt-2">
            <button
              onClick={applyFilters}
              className="w-full py-3 rounded-lg font-bold text-white text-sm tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95 shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              Aplicar Filtros
            </button>
            <button
              onClick={clearFilters}
              className="w-full py-3 rounded-lg font-semibold text-gray-700 text-sm border-2 border-gray-200 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95"
            >
              Limpar Filtros
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header - Premium Typography */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8 md:mb-10">
            <div>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-gray-900">
                {pageTitle}
              </h1>
              <p className="text-sm text-gray-500 mt-2 tracking-wide">
                {sortedProducts.length} {sortedProducts.length === 1 ? 'produto' : 'produtos'}
              </p>
              {isSearching && (
                <button
                  onClick={clearSearch}
                  className="mt-3 text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 group"
                >
                  <X size={16} className="group-hover:rotate-90 transition-transform duration-200" />
                  Limpar busca
                </button>
              )}
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
               {/* Filtros Mobile Button - Premium */}
               <button
                 className="lg:hidden flex items-center justify-center gap-2 font-semibold text-sm border-2 border-gray-200 px-5 py-3 rounded-lg min-h-[44px] flex-1 sm:flex-none hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 active:scale-95"
                 onClick={() => setIsMobileFiltersOpen(true)}
               >
                 <Menu size={18} strokeWidth={2} />
                 Filtros
               </button>

               {/* Sort Select - Premium */}
               <select
                 className="bg-white font-semibold text-sm border-2 border-gray-200 rounded-lg px-4 py-3 min-h-[44px] transition-all duration-200 cursor-pointer flex-1 sm:flex-none sm:min-w-[180px] hover:border-gray-300"
                 style={{
                   outline: 'none'
                 }}
                 onFocus={(e) => e.target.style.borderColor = primaryColor}
                 onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                 value={filterState.sort}
                 onChange={(e) => setFilterState(prev => ({ ...prev, sort: e.target.value }))}
               >
                 <option value="relevance">Mais Recentes</option>
                 <option value="price_asc">Menor Preço</option>
                 <option value="price_desc">Maior Preço</option>
               </select>
            </div>
          </div>

          {/* Grid de produtos - Premium Layout */}
          {sortedProducts.length === 0 ? (
            <div className="text-center py-20 md:py-24">
              <Package size={64} className="mx-auto mb-6 text-gray-300" strokeWidth={1.5} />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
              <p className="text-sm text-gray-500 mb-6">Tente ajustar os filtros ou explorar outras categorias</p>
              <BrandLink to="/shop">
                <Button variant="outline" className="mt-4">Ver todos os produtos</Button>
              </BrandLink>
            </div>
          ) : (
            <motion.div
              key={`${categorySlug || 'all'}-${sortedProducts.length}`}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8"
            >
              {sortedProducts.map((product: any, index: number) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer - Premium with Framer Motion */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMobileFiltersOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute top-0 left-0 w-[85%] max-w-sm h-full bg-white shadow-2xl flex flex-col"
            >
              {/* Header - Premium */}
              <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
                <h2 className="font-bold text-lg tracking-wide text-gray-900">Filtros</h2>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95"
                  aria-label="Fechar filtros"
                >
                  <X size={22} strokeWidth={2} />
                </button>
              </div>

              {/* Content - Premium Spacing */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.08
                    }
                  }
                }}
                className="flex-1 overflow-y-auto p-5 space-y-8"
              >
                {/* Categorias */}
                {categories && categories.length > 0 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="pb-8 border-b border-gray-100"
                  >
                    <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-gray-900">Categorias</h3>
                  <div className="space-y-2">
                    <BrandLink
                      to="/shop"
                      onClick={() => setIsMobileFiltersOpen(false)}
                      className={`block py-2 text-sm transition-colors ${!categorySlug ? 'font-bold' : 'text-gray-600'}`}
                      style={!categorySlug ? { color: primaryColor } : {}}
                    >
                      Todos os Produtos
                    </BrandLink>
                    {categories.map((cat: Category) => (
                      <div key={cat.id}>
                        <BrandLink
                          to={`/shop?category=${cat.slug}`}
                          onClick={() => setIsMobileFiltersOpen(false)}
                          className={`block py-2 text-sm transition-colors ${categorySlug === cat.slug ? 'font-bold' : 'text-gray-600'}`}
                          style={categorySlug === cat.slug ? { color: primaryColor } : {}}
                        >
                          {cat.name}
                        </BrandLink>
                        {/* Subcategorias mobile */}
                        {cat.children && cat.children.length > 0 && (
                          <div className="pl-4 space-y-1 border-l border-gray-200 ml-2">
                            {cat.children.map((sub: Category) => (
                              <BrandLink
                                key={sub.id}
                                to={`/shop?category=${sub.slug}`}
                                onClick={() => setIsMobileFiltersOpen(false)}
                                className={`block py-1 text-xs transition-colors ${categorySlug === sub.slug ? 'font-bold' : 'text-gray-500'}`}
                                style={categorySlug === sub.slug ? { color: primaryColor } : {}}
                              >
                                {sub.name}
                              </BrandLink>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  </motion.div>
                )}

                {/* Preço */}
                {allPrices.length > 0 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="pb-8 border-b border-gray-100"
                  >
                    <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-gray-900">Preço</h3>
                    <p className="text-xs text-gray-400 mb-3">
                      R$ {minPriceAvailable.toLocaleString('pt-BR')} — R$ {maxPriceAvailable.toLocaleString('pt-BR')}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="Mín"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none min-h-[44px] w-0"
                        onFocus={(e) => e.target.style.borderColor = primaryColor}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                      <span className="text-gray-400 font-medium flex-shrink-0">–</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Máx"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none min-h-[44px] w-0"
                        onFocus={(e) => e.target.style.borderColor = primaryColor}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Tamanhos */}
                {availableSizes.length > 0 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className="pb-8 border-b border-gray-100"
                  >
                    <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-gray-900">Tamanho</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {availableSizes.map((size: string) => (
                        <button
                          key={size}
                          onClick={() => togglePendingFilter('size', size)}
                          className={`py-3 text-sm font-bold border-2 rounded-lg transition-all duration-200 min-h-[48px] active:scale-95 ${pendingSizes.includes(size) ? 'text-white shadow-md' : 'bg-white text-gray-700 border-gray-200'}`}
                          style={pendingSizes.includes(size) ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Cores - com hex real do banco */}
                {availableColors.length > 0 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-gray-900">Cores</h3>
                    <div className="flex flex-wrap gap-3">
                      {availableColors.map((colorObj: any) => (
                        <button
                          key={colorObj.name}
                          onClick={() => togglePendingFilter('color', colorObj.name)}
                          className={`w-11 h-11 rounded-full border-2 relative transition-all duration-200 hover:scale-110 active:scale-95 ${pendingColors.includes(colorObj.name) ? 'shadow-md border-transparent' : 'border-gray-200'}`}
                          style={{
                            backgroundColor: colorObj.hex || '#cccccc',
                            ...(pendingColors.includes(colorObj.name) && { outline: `3px solid ${primaryColor}`, outlineOffset: '2px' })
                          }}
                          title={colorObj.name}
                          aria-label={`Filtrar por cor: ${colorObj.name}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Footer - Premium Buttons */}
              <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                <button
                  onClick={() => {
                    applyFilters();
                    setIsMobileFiltersOpen(false);
                  }}
                  className="w-full py-4 rounded-lg font-bold text-white text-sm tracking-wide transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                  style={{ backgroundColor: primaryColor }}
                >
                  Aplicar Filtros
                </button>
                <button
                  onClick={() => {
                    clearFilters();
                    setIsMobileFiltersOpen(false);
                  }}
                  className="w-full py-4 rounded-lg font-semibold text-gray-700 text-sm border-2 border-gray-200 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95"
                >
                  Limpar Filtros
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useBrandNavigate();
  const { addToCart, setIsCartOpen } = useCart();
  const { primaryColor } = useBrandColors();
  const { brand } = useBrand();
  const { user } = useAuth();
  const isFavorite = useIsFavorite(id || '');
  const { mutate: toggleFavorite } = useToggleFavorite();

  // Buscar produto do banco de dados
  const { data: product, isLoading, error } = useProduct(id || '');
  // Buscar sugestões vinculadas ao produto via product_suggestions
  const { data: relatedProducts } = useProductSuggestions(id || '');

  // Filtrar relacionados com reatividade ao login
  const visibleRelatedProducts = useMemo(() => {
    return (relatedProducts || []).filter((p: any) => p.id !== product?.id && (!p.is_tabaco || user)).slice(0, 4);
  }, [relatedProducts, product?.id, user]);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImage, setActiveImage] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Extrair imagens ordenadas
  const images = product?.product_images
    ? [...product.product_images].sort((a: any, b: any) => a.position - b.position).map((img: any) => img.url)
    : [];

  // Extrair TODAS as variantes (incluindo sem estoque)
  const variants = product?.product_variants || [];

  // Extrair cores e tamanhos únicos de TODAS as variantes
  const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))] as string[];
  const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))] as string[];

  // Debug temporário
  useEffect(() => {
    if (product) {
      console.log('=== DEBUG VARIANTES ===');
      console.log('Produto:', product.name);
      console.log('product_variants raw:', product.product_variants);
      console.log('Variantes filtradas (active):', variants);
      console.log('Número de variantes:', variants.length);
      console.log('Cores únicas:', colors);
      console.log('Tamanhos únicos:', sizes);
      variants.forEach((v: any, i: number) => {
        console.log(`Variante ${i}:`, {
          id: v.id,
          color: v.color,
          size: v.size,
          stock: v.stock,
          active: v.active
        });
      });
    }
  }, [product, variants.length, colors.length, sizes.length]);

  // Cores hexadecimais mapeadas
  const colorHexMap = variants.reduce((acc: Record<string, string>, v: any) => {
    if (v.color && v.color_hex) acc[v.color] = v.color_hex;
    return acc;
  }, {});

  // Definir cor padrão
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      setSelectedColor(colors[0]);
    }
  }, [colors, selectedColor]);

  // Verificar estoque da variante selecionada
  const getVariantStock = (color: string, size: string) => {
    // Se não tem tamanhos (produto apenas com cores)
    if (sizes.length === 0 && color) {
      const variant = variants.find((v: any) => v.color === color && !v.size);
      return variant?.stock || 0;
    }

    // Se tem tamanhos e cores
    if (color && size) {
      const variant = variants.find((v: any) => v.color === color && v.size === size);
      return variant?.stock || 0;
    }

    // Se apenas tamanhos (sem cores)
    if (colors.length === 0 && size) {
      const variant = variants.find((v: any) => v.size === size && !v.color);
      return variant?.stock || 0;
    }

    return 0;
  };

  // Retorna o preço da variante selecionada (com fallback para o produto)
  const getVariantPricing = (color: string, size: string) => {
    let variant: any = null;

    if (sizes.length === 0 && color) {
      variant = variants.find((v: any) => v.color === color && !v.size);
    } else if (color && size) {
      variant = variants.find((v: any) => v.color === color && v.size === size);
    } else if (colors.length === 0 && size) {
      variant = variants.find((v: any) => v.size === size && !v.color);
    }

    const variantPrice = variant?.price != null ? Number(variant.price) : null;
    const variantCompareAt = variant?.compare_at_price != null ? Number(variant.compare_at_price) : null;

    return {
      price: variantPrice ?? Number(product.price),
      compareAtPrice: variantCompareAt ?? (product.compare_at_price ? Number(product.compare_at_price) : null),
    };
  };

  // Tamanhos disponíveis para a cor selecionada
  const availableSizesForColor = sizes.filter(size =>
    getVariantStock(selectedColor, size) > 0
  );

  // Verificar se há algum estoque disponível no produto
  const hasAnyStock = () => {
    if (variants.length === 0) return true; // Se não há variantes, assume que tem estoque
    return variants.some((v: any) => v.stock > 0);
  };

  // Verificar se a combinação selecionada tem estoque
  const isCurrentSelectionInStock = () => {
    if (variants.length === 0) return true;

    // Se precisa de ambos (cor e tamanho)
    if (sizes.length > 0 && colors.length > 0) {
      if (!selectedColor || !selectedSize) return true; // Ainda não selecionou tudo
      return getVariantStock(selectedColor, selectedSize) > 0;
    }

    // Se tem apenas tamanhos
    if (sizes.length > 0 && colors.length === 0) {
      if (!selectedSize) return true; // Ainda não selecionou
      return getVariantStock('', selectedSize) > 0;
    }

    // Se tem apenas cores (sem tamanhos)
    if (colors.length > 0 && sizes.length === 0) {
      if (!selectedColor) return true; // Ainda não selecionou
      const stock = getVariantStock(selectedColor, '');
      console.log(`Verificando estoque para cor ${selectedColor}:`, stock);
      return stock > 0;
    }

    return true;
  };

  const handleAddToCart = () => {
    // Verificar se precisa de seleção de variante
    const needsSize = sizes.length > 0;
    const needsColor = colors.length > 0;

    // Se tem tamanhos mas nenhum foi selecionado
    if (needsSize && !selectedSize) {
      setShowError(true);
      return;
    }

    // Se tem cores mas nenhuma foi selecionada (apenas quando não há tamanhos)
    if (!needsSize && needsColor && !selectedColor) {
      setShowError(true);
      return;
    }

    // Verificar estoque
    if (variants.length > 0) {
      const stock = getVariantStock(selectedColor, selectedSize);
      if (stock <= 0) {
        alert('Produto sem estoque');
        return;
      }
    }

    setShowError(false);

    // Adaptar produto para o formato do carrinho
    const { price: variantPrice } = getVariantPricing(selectedColor, selectedSize);
    const cartProduct = {
      ...product,
      images: images,
      colors: colors,
      sizes: sizes,
      price: variantPrice,
      rating: 5,
      reviews: 0,
    };

    // Passar os valores selecionados ou valores padrão
    const finalSize = selectedSize || '';
    const finalColor = selectedColor || '';

    addToCart(cartProduct as any, finalSize, finalColor);
    setIsCartOpen(true);
  };

  // Loading state
  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  // Error state
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center animate-fade-in">
        <h1 className="font-sans text-4xl mb-4">PRODUTO NÃO ENCONTRADO</h1>
        <p className="text-gray-500 mb-8">O produto que você procura não existe ou foi removido.</p>
        <Button onClick={() => navigate('/shop')}>VOLTAR PARA A LOJA</Button>
      </div>
    );
  }

  // Produto de tabaco: só mostra se o usuário estiver logado
  if (product.is_tabaco && !user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center animate-fade-in">
        <h1 className="font-sans text-4xl mb-4">ACESSO RESTRITO</h1>
        <p className="text-gray-500 mb-8">Este produto é restrito. Faça login para visualizar.</p>
        <Button onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}>FAZER LOGIN</Button>
      </div>
    );
  }

  const { price, compareAtPrice } = getVariantPricing(selectedColor, selectedSize);
  const discount = compareAtPrice ? Math.round((1 - price / compareAtPrice) * 100) : 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 py-4 sm:py-6 lg:py-8 max-w-[1280px]">
      {/* Breadcrumb */}
      <nav className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 mb-6 lg:mb-8 uppercase tracking-widest">
        <BrandLink to="/" className="hover:text-gray-900 transition-colors">Home</BrandLink>
        <ChevronRight size={12} className="text-gray-300" />
        <BrandLink to="/shop" className="hover:text-gray-900 transition-colors">{product.category || 'Produtos'}</BrandLink>
        <ChevronRight size={12} className="text-gray-300" />
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 xl:gap-12 mb-10 md:mb-16 items-start"
      >
        {/* Gallery */}
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 lg:items-start w-full min-w-0">
          {/* Thumbnails - horizontal em mobile, vertical em desktop */}
          {images.length > 1 && (
            <div className="order-2 lg:order-1 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-1 lg:pb-0 scrollbar-hide flex-shrink-0 lg:w-[56px] lg:max-h-[520px]">
              {images.map((img: string, idx: number) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-12 lg:w-[56px] aspect-square flex-shrink-0 rounded-lg transition-all duration-200 overflow-hidden ${
                    activeImage === idx
                      ? 'ring-2 ring-offset-2 shadow-sm'
                      : 'border border-gray-200 hover:border-gray-300 opacity-60 hover:opacity-100'
                  }`}
                  style={activeImage === idx ? { outlineColor: primaryColor } : {}}
                  onClick={() => setActiveImage(idx)}
                >
                  <img src={img} alt="" className="w-full h-full object-cover object-center" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Main Image - 1:1 fixo, sem overflow em nenhum breakpoint */}
          <div
            className="order-1 lg:order-2 w-full flex-1 aspect-square overflow-hidden bg-gray-50 rounded-xl relative group cursor-zoom-in max-w-[520px]"
            onClick={() => setIsLightboxOpen(true)}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null) return;
              const diff = touchStartX - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) {
                if (diff > 0) setActiveImage(i => Math.min(i + 1, images.length - 1));
                else setActiveImage(i => Math.max(i - 1, 0));
              }
              setTouchStartX(null);
            }}
          >
            {discount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="absolute top-3 left-3 z-10 text-white text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              >
                {discount}% OFF
              </motion.span>
            )}
            <motion.img
              key={activeImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={images[activeImage] || 'https://via.placeholder.com/600x800?text=Sem+Imagem'}
              alt={product.name}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />

            {/* Arrow navigation - desktop only */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImage(i => Math.max(i - 1, 0)); }}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md transition-all duration-200 hidden md:flex items-center justify-center ${activeImage === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110'}`}
                  disabled={activeImage === 0}
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={20} className="text-gray-800" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveImage(i => Math.min(i + 1, images.length - 1)); }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md transition-all duration-200 hidden md:flex items-center justify-center ${activeImage === images.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110'}`}
                  disabled={activeImage === images.length - 1}
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={20} className="text-gray-800" />
                </button>
              </>
            )}

            {/* Zoom overlay - desktop only */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 hidden md:flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  Ampliar
                </p>
              </div>
            </div>

            {/* Mobile dot indicators - clicáveis */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden bg-black/20 backdrop-blur-sm rounded-full px-2.5 py-1.5">
                {images.map((_: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setActiveImage(idx); }}
                    className={`rounded-full transition-all duration-200 ${
                      activeImage === idx ? 'w-5 h-1.5' : 'w-1.5 h-1.5 bg-white/60'
                    }`}
                    style={activeImage === idx ? { backgroundColor: '#fff' } : {}}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-semibold mb-4 leading-snug tracking-tight text-gray-900">{product.name}</h1>

          {/* Preços - fundo com tom levemente diferenciado */}
          <div className="mb-6 pb-6 border-b border-gray-100 rounded-xl bg-gray-50/70 px-4 py-4 -mx-4 sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:rounded-none">
            <PriceDisplay
              price={price}
              originalPrice={compareAtPrice}
              pixDiscount={0.05}
              showInstallments={true}
              showPixPrice={true}
              showDropdown={true}
            />
          </div>

          <div className="space-y-5 mb-6 rounded-xl bg-gray-50/60 p-4 -mx-4 sm:mx-0 sm:p-0 sm:bg-transparent sm:rounded-none">
            {/* Cores */}
            {colors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  Cor: <span className="text-gray-800 normal-case tracking-normal font-medium text-xs">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((color: string) => {
                    const hasStock = sizes.length === 0
                      ? getVariantStock(color, '') > 0
                      : sizes.some(size => getVariantStock(color, size) > 0);

                    return (
                      <button
                        key={color}
                        onClick={() => {
                          if (!hasStock) return;
                          setSelectedColor(color);
                          if (selectedSize && getVariantStock(color, selectedSize) <= 0) {
                            setSelectedSize('');
                          }
                        }}
                        className={`w-8 h-8 rounded-full transition-all duration-200 relative flex-shrink-0 ${
                          selectedColor === color
                            ? 'ring-2 ring-offset-2 scale-110 shadow-sm'
                            : hasStock
                              ? 'ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105'
                              : 'ring-1 ring-gray-100 opacity-30 cursor-not-allowed'
                        }`}
                        style={{ backgroundColor: colorHexMap[color] || '#cccccc' }}
                        title={`${color}${!hasStock ? ' (Sem estoque)' : ''}`}
                      >
                        {!hasStock && (
                          <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
                            <div className="w-[130%] h-px bg-red-400 rotate-45 absolute"></div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tamanhos */}
            {sizes.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    Tamanho: <span className="text-gray-800 normal-case tracking-normal font-medium text-xs">{selectedSize || 'Selecione'}</span>
                  </p>
                  <button className="text-[11px] text-gray-400 hover:text-gray-900 transition-colors underline underline-offset-2">
                    Tabela de medidas
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size: string) => {
                    const stock = getVariantStock(selectedColor, size);
                    const isOutOfStock = stock <= 0;

                    return (
                      <button
                        key={size}
                        onClick={() => {
                          if (!isOutOfStock) {
                            setSelectedSize(size);
                            setShowError(false);
                          }
                        }}
                        disabled={isOutOfStock}
                        className={`min-w-[42px] h-10 px-3 flex items-center justify-center font-semibold text-sm rounded-lg border transition-all duration-200 ${
                          isOutOfStock
                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                            : selectedSize === size
                            ? 'text-white border-transparent shadow-sm'
                            : showError && !selectedSize
                            ? 'border-red-300 bg-red-50 text-red-500'
                            : 'bg-white text-gray-800 border-gray-200 hover:border-gray-800'
                        }`}
                        style={selectedSize === size && !isOutOfStock ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                {showError && !selectedSize && (
                  <p className="text-red-500 text-xs mt-2 font-medium">Selecione um tamanho para continuar.</p>
                )}
                {selectedSize && selectedColor && (
                  <StockWarning
                    stock={getVariantStock(selectedColor, selectedSize)}
                    threshold={10}
                    className="mt-3"
                  />
                )}
              </div>
            )}

            {/* Sem variantes */}
            {variants.length === 0 && (
              <div className="text-sm p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="font-medium text-gray-700 mb-1">Produto sem variantes</p>
                <p className="text-xs text-gray-400">Adicione variantes no painel administrativo.</p>
              </div>
            )}

            {/* Sem estoque */}
            {variants.length > 0 && !hasAnyStock() && (
              <div className="text-sm p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="font-medium text-red-700 mb-1">Produto Indisponível</p>
                <p className="text-xs text-red-500">Temporariamente sem estoque.</p>
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-3 mb-6"
          >
            <Button
              variant="primary"
              fullWidth
              className="h-11 md:h-12 text-sm font-semibold tracking-wide transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
              onClick={handleAddToCart}
              disabled={
                !hasAnyStock() ||
                !isCurrentSelectionInStock() ||
                (variants.length > 0 && ((sizes.length > 0 && !selectedSize) || (sizes.length === 0 && colors.length > 0 && !selectedColor)))
              }
            >
              {!hasAnyStock()
                ? 'INDISPONÍVEL'
                : !isCurrentSelectionInStock()
                  ? 'INDISPONÍVEL'
                  : sizes.length > 0 && !selectedSize
                    ? 'SELECIONE UM TAMANHO'
                    : sizes.length === 0 && colors.length > 0 && !selectedColor
                      ? 'SELECIONE UMA VARIAÇÃO'
                      : 'ADICIONAR À SACOLA'}
            </Button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-11 h-11 md:w-12 md:h-12 flex-shrink-0 border flex items-center justify-center rounded-lg transition-all duration-200 ${isFavorite ? 'border-red-300 bg-red-50 hover:bg-red-100' : 'border-gray-200 hover:border-gray-800 hover:bg-gray-50'}`}
              onClick={() => {
                if (!user) {
                  window.dispatchEvent(new CustomEvent('open-login-modal'));
                  return;
                }
                toggleFavorite(id || '');
              }}
              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <Heart size={18} className={`transition-colors duration-200 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </motion.button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <TrustBadges />
          </motion.div>

        </div>
      </motion.div>

      {/* Product Information Accordions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-3xl mx-auto mb-10 md:mb-16"
      >
        <ProductAccordion
          defaultOpen={(product.description || (product.tags && product.tags.length > 0)) ? 'description' : 'shipping'}
          sections={[
            ...(product.description || (product.tags && product.tags.length > 0) ? [{
              id: 'description',
              title: 'Descrição do Produto',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              ),
              content: (
                <div>
                  {product.description && (
                    <p className="text-gray-600 leading-relaxed mb-4">{product.description}</p>
                  )}
                  {product.subcategory && (
                    <p className="text-xs text-gray-400 mb-4">
                      Categoria: <span className="text-gray-600 font-medium">{product.category}{product.subcategory ? ` › ${product.subcategory}` : ''}</span>
                    </p>
                  )}
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {product.tags.map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: `${primaryColor}10`,
                            borderColor: `${primaryColor}30`,
                            color: primaryColor
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            }] : []),
            {
              id: 'shipping',
              title: 'Calcular Frete',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              ),
              content: (
                <ShippingCalculator cartTotal={price} />
              )
            }
          ]}
        />
      </motion.div>

      {/* Produtos Relacionados */}
      {visibleRelatedProducts && visibleRelatedProducts.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="border-t border-gray-100 pt-10 md:pt-16"
        >
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900">
              Você também vai curtir
            </h2>
            <BrandLink
              to="/shop"
              className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 uppercase tracking-widest"
            >
              Ver tudo <ChevronRight size={12} />
            </BrandLink>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {visibleRelatedProducts.map((p: any, index: number) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 + index * 0.08 }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        currentIndex={activeImage}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        onNext={() => setActiveImage((prev) => (prev + 1) % images.length)}
        onPrev={() => setActiveImage((prev) => (prev - 1 + images.length) % images.length)}
        productName={product.name}
      />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA
        price={price}
        onAddToCart={handleAddToCart}
        disabled={
          !hasAnyStock() ||
          !isCurrentSelectionInStock() ||
          (variants.length > 0 && ((sizes.length > 0 && !selectedSize) || (sizes.length === 0 && colors.length > 0 && !selectedColor)))
        }
        buttonText={
          !hasAnyStock()
            ? 'INDISPONÍVEL'
            : !isCurrentSelectionInStock()
              ? 'INDISPONÍVEL'
              : sizes.length > 0 && !selectedSize
                ? 'SELECIONE UM TAMANHO'
                : 'ADICIONAR À SACOLA'
        }
      />
    </div>
  );
};

// --- App Container with Providers ---

const App = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    addToCart: storeAddToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
  } = useCartStore();

  const addToCart = (product: Product, size: string, color: string) => {
    storeAddToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      images: product.images || [],
      selectedSize: size,
      selectedColor: color,
      quantity: 1,
    });
  };

  // Lista de slugs de marcas válidos
  const brandSlugs = Object.keys(BRAND_CONFIGS);

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <BrandProvider>
          <AuthProvider>
            <SearchProvider>
              <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, isCartOpen, setIsCartOpen }}>
                <ToastNotification />
                <ScrollToTop />
                <SEOHead />
                <AgeVerificationPopup />
                <PromoPopup />
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <div className="flex-1">
                    <Routes>
                  {/* Rotas com prefixo de marca: /:brand/... */}
                  {brandSlugs.map(brand => (
                    <Route key={brand} path={`/${brand}/*`} element={
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/shop" element={<ProductListPage />} />
                        <Route path="/product/:id" element={<ProductDetailPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/checkout" element={<CheckoutPage />} />
                        <Route path="/about" element={<Navigate to="/page/sobre-nos" replace />} />
                        <Route path="/club" element={<Navigate to="/page/sobre-nos" replace />} />
                        <Route path="/faq" element={<FAQPage />} />
                        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                        <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                        <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                        <Route path="/page/:slug" element={<StaticPageRenderer />} />
                        <Route path="*" element={<HomePage />} />
                      </Routes>
                    } />
                  ))}

                  {/* Rotas sem prefixo (fallback para marca padrão) */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ProductListPage />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/about" element={<Navigate to="/page/sobre-nos" replace />} />
                  <Route path="/club" element={<Navigate to="/page/sobre-nos" replace />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                  <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/page/:slug" element={<StaticPageRenderer />} />
                    <Route path="*" element={<HomePage />} />
                  </Routes>
                </div>
                <Footer />
              </div>
            </CartContext.Provider>
            </SearchProvider>
          </AuthProvider>
        </BrandProvider>
      </HashRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;