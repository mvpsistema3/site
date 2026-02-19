import React from 'react';
import { motion } from 'framer-motion';
import { User, ShoppingBag, Heart, Settings, ChevronLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useBrandColors } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { useBrandNavigate, BrandLink } from './BrandLink';

// ─── Navigation Items ───────────────────────────────────

const NAV_ITEMS = [
  { path: '/profile', label: 'Meu Perfil', icon: User },
  { path: '/orders', label: 'Pedidos', icon: ShoppingBag },
  { path: '/favorites', label: 'Favoritos', icon: Heart },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

// ─── Account Layout ─────────────────────────────────────

export function AccountLayout({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const { primaryColor } = useBrandColors();
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useBrandNavigate();

  const profileReady = !authLoading && !!profile;
  const displayName = profileReady
    ? (profile.display_name || user?.email?.split('@')[0] || '')
    : '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '';

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-5 lg:py-8">
        <div className="max-w-5xl mx-auto">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-5 lg:mb-7"
          >
            {/* Back link (mobile) */}
            <button
              onClick={() => navigate('/')}
              className="lg:hidden flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors mb-3"
            >
              <ChevronLeft size={12} />
              Voltar à loja
            </button>

            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <Icon size={18} style={{ color: primaryColor }} />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-900 tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Two-column layout */}
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-7">

            {/* Sidebar (desktop) */}
            <motion.aside
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="hidden lg:block w-52 flex-shrink-0"
            >
              <div className="sticky top-24">
                {/* User card */}
                <div className="bg-white rounded-lg border border-gray-100 p-3.5 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{displayName}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Nav links */}
                <nav className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                  {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname.includes(item.path);
                    const ItemIcon = item.icon;
                    return (
                      <BrandLink
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors relative ${
                          isActive
                            ? 'font-semibold text-gray-900 bg-gray-50/70'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/40'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="account-nav-indicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                            style={{ backgroundColor: primaryColor }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <ItemIcon
                          size={16}
                          style={isActive ? { color: primaryColor } : undefined}
                          className={isActive ? '' : 'text-gray-400'}
                        />
                        {item.label}
                      </BrandLink>
                    );
                  })}
                </nav>
              </div>
            </motion.aside>

            {/* Mobile tab bar */}
            <div className="lg:hidden -mx-4 px-4 mb-1">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname.includes(item.path);
                  const ItemIcon = item.icon;
                  return (
                    <BrandLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'text-white shadow-sm'
                          : 'bg-white text-gray-500 border border-gray-200/80'
                      }`}
                      style={isActive ? { backgroundColor: primaryColor } : undefined}
                    >
                      <ItemIcon size={12} />
                      {item.label}
                    </BrandLink>
                  );
                })}
              </div>
            </div>

            {/* Main content */}
            <motion.main
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
              className="flex-1 min-w-0"
            >
              {children}
            </motion.main>
          </div>
        </div>
      </div>
    </div>
  );
}
