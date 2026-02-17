import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
}

interface UserBrand {
  brand_slug: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userBrands: UserBrand[];
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string, brandSlug?: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasAccessToBrand: (brandSlug: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userBrands, setUserBrands] = useState<UserBrand[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar o perfil do usuário
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }, []);

  // Função para buscar as marcas do usuário
  const fetchUserBrands = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_brands')
        .select('brand_slug, created_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar marcas do usuário:', error);
        return [];
      }

      return (data || []) as UserBrand[];
    } catch (error) {
      console.error('Erro ao buscar marcas do usuário:', error);
      return [];
    }
  }, []);

  // Função para atualizar o estado do usuário
  const updateUserState = useCallback(async (session: Session | null) => {
    if (session?.user) {
      setUser(session.user);
      setSession(session);

      // Buscar perfil e marcas do usuário
      const [userProfile, brands] = await Promise.all([
        fetchProfile(session.user.id),
        fetchUserBrands(session.user.id),
      ]);

      setProfile(userProfile);
      setUserBrands(brands);
    } else {
      setUser(null);
      setProfile(null);
      setUserBrands([]);
      setSession(null);
    }
    setLoading(false);
  }, [fetchProfile, fetchUserBrands]);

  // Verificar sessão existente ao carregar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        await updateUserState(currentSession);
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await updateUserState(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateUserState]);

  // Login com email e senha
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Cadastro com email e senha
  const signUp = async (email: string, password: string, displayName?: string, brandSlug?: string) => {
    try {
      // Primeiro, tentar fazer signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      // Se o usuário já existe, tentar associar à nova marca
      if (error && error.message.includes('already registered')) {
        // Buscar usuário existente por email
        const { data: existingUsers } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (existingUsers) {
          // Associar usuário à nova marca
          const { error: brandError } = await supabase
            .from('user_brands')
            .insert({
              user_id: existingUsers.id,
              brand_slug: brandSlug || 'sesh',
            });

          if (brandError && !brandError.message.includes('duplicate')) {
            console.error('Erro ao associar marca:', brandError);
            return {
              error: {
                message: 'Erro ao associar à marca. Entre com sua senha para acessar.'
              } as AuthError
            };
          }

          return {
            error: {
              message: 'Você já possui cadastro! Use "Entrar" para acessar com sua senha.'
            } as AuthError
          };
        }
      }

      if (error) return { error };

      // Criar perfil do usuário na tabela users
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            display_name: displayName,
          });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }

        // Associar usuário à marca
        const { error: brandError } = await supabase
          .from('user_brands')
          .insert({
            user_id: data.user.id,
            brand_slug: brandSlug || 'sesh',
          });

        if (brandError) {
          console.error('Erro ao associar marca:', brandError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Login com Magic Link
  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Logout
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Atualizar perfil manualmente
  const refreshProfile = async () => {
    if (user) {
      const [userProfile, brands] = await Promise.all([
        fetchProfile(user.id),
        fetchUserBrands(user.id),
      ]);
      setProfile(userProfile);
      setUserBrands(brands);
    }
  };

  // Verificar se usuário tem acesso à marca
  const hasAccessToBrand = (brandSlug: string) => {
    return userBrands.some(brand => brand.brand_slug === brandSlug);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userBrands,
        session,
        loading,
        signIn,
        signUp,
        signInWithMagicLink,
        signOut,
        refreshProfile,
        hasAccessToBrand,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
