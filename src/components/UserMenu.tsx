import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, ShoppingBag, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const UserMenu: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar menu ao clicar fora
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

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  if (!user) return null;

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Usuário';
  const email = user.email || '';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Menu do usuário"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            avatarInitial
          )}
        </div>

        {/* Name (hidden on mobile) */}
        <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={16}
          className={`hidden md:block text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navegar para página de perfil
                console.log('Navegar para perfil');
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <User size={18} className="text-gray-600" />
              <span className="text-sm text-gray-700">Meu Perfil</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navegar para página de pedidos
                console.log('Navegar para pedidos');
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <ShoppingBag size={18} className="text-gray-600" />
              <span className="text-sm text-gray-700">Meus Pedidos</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                // TODO: Navegar para página de configurações
                console.log('Navegar para configurações');
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Settings size={18} className="text-gray-600" />
              <span className="text-sm text-gray-700">Configurações</span>
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-colors text-left group"
            >
              <LogOut size={18} className="text-gray-600 group-hover:text-red-600" />
              <span className="text-sm text-gray-700 group-hover:text-red-600">Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
