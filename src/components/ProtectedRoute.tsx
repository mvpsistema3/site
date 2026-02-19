import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Dispatch event to open login modal
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm text-center">
          Você precisa estar logado para acessar esta página.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
