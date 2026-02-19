import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ShoppingBag, Heart, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrandColors } from '../hooks/useTheme';
import { useToastStore } from '../stores/toastStore';
import { getBrandUrlPrefix } from '../lib/brand-detection';
import { useBrandNavigate } from './BrandLink';

export const UserMenu: React.FC = () => {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const { primaryColor } = useBrandColors();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useBrandNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = () => {
    setIsOpen(false);
    addToast('Você saiu da sua conta. Até logo!', 'info');
    const brandPrefix = getBrandUrlPrefix();
    window.location.hash = '#' + brandPrefix + '/';
    signOut().catch(() => {});
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (!user) return null;

  const profileReady = !authLoading && !!profile;
  const fullName = profileReady
    ? (profile.display_name || user.email?.split('@')[0] || 'Usuário')
    : 'Usuário';
  const firstName = fullName.split(' ')[0];
  const email = user.email || '';
  const avatarInitial = profileReady ? firstName.charAt(0).toUpperCase() : '';

  const menuItems = [
    { icon: User, label: 'Meu Perfil', path: '/profile' },
    { icon: ShoppingBag, label: 'Meus Pedidos', path: '/orders' },
    { icon: Heart, label: 'Favoritos', path: '/favorites' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 hover:ring-2 hover:ring-gray-200"
        style={{
          backgroundColor: isOpen ? `${primaryColor}12` : undefined,
        }}
        aria-label="Menu do usuário"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold tracking-wide"
          style={{
            backgroundColor: `${primaryColor}15`,
            color: primaryColor,
          }}
        >
          {avatarInitial}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
            <p className="text-[13px] font-semibold text-gray-900 truncate">{fullName}</p>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{email}</p>
          </div>

          {/* Nav items */}
          <div className="py-1">
            {menuItems.map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => {
                  setIsOpen(false);
                  navigate(path);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left group"
              >
                <Icon size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                <span className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50/60 transition-colors text-left group"
            >
              <LogOut size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
              <span className="text-[13px] text-gray-600 group-hover:text-red-600 transition-colors">Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
