import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { BRAND_CONFIGS } from '../config/brands';
import { getCurrentBrand } from '../lib/brand-detection';

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  cpf: string | null;
}

interface CustomerBrand {
  brand_slug: string;
  created_at: string;
}

interface SignUpResult {
  error: AuthError | null;
  linked?: {
    existingBrands: string[]; // nomes das marcas onde já tinha conta
    newBrand: string;         // nome da marca sendo vinculada agora
    alreadyLinked: boolean;   // true se já estava vinculado a esta marca
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  userBrands: CustomerBrand[];
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string, brandSlug?: string) => Promise<SignUpResult>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasAccessToBrand: (brandSlug: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userBrands, setUserBrands] = useState<CustomerBrand[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar o perfil do usuário
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select('id, email, display_name, phone, cpf')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      return data as UserProfile | null;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }, []);

  // Função para buscar as marcas do cliente
  const fetchCustomerBrands = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_brands')
        .select('brand_slug, created_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar marcas do cliente:', error);
        return [];
      }

      return (data || []) as CustomerBrand[];
    } catch (error) {
      console.error('Erro ao buscar marcas do cliente:', error);
      return [];
    }
  }, []);

  // Função para atualizar o estado do usuário
  const updateUserState = useCallback(async (session: Session | null) => {
    try {
      if (session?.user) {
        setUser(session.user);
        setSession(session);

        // Buscar perfil e marcas do cliente
        const [userProfile, fetchedBrands] = await Promise.all([
          fetchProfile(session.user.id),
          fetchCustomerBrands(session.user.id),
        ]);
        let brands = fetchedBrands;

        // Auto-criar perfil de cliente se não existir (ex: usuário legado)
        if (!userProfile) {
          const displayName = session.user.user_metadata?.display_name || null;
          const { data: newProfile, error: profileError } = await supabase
            .from('customer_profiles')
            .upsert({
              id: session.user.id,
              email: session.user.email,
              display_name: displayName,
            }, { onConflict: 'id' })
            .select('id, email, display_name, phone, cpf')
            .maybeSingle();

          if (profileError) {
            console.error('Erro ao auto-criar perfil:', profileError);
          }

          setProfile(newProfile as UserProfile | null);
        } else {
          setProfile(userProfile);
        }

        // Auto-vincular à marca atual se ainda não estiver vinculado
        const currentBrandSlug = getCurrentBrand();
        if (currentBrandSlug && !brands.some(b => b.brand_slug === currentBrandSlug)) {
          const { error: linkError } = await supabase
            .from('customer_brands')
            .upsert({
              user_id: session.user.id,
              brand_slug: currentBrandSlug,
            }, { onConflict: 'user_id,brand_slug' });

          if (!linkError) {
            brands = [...brands, { brand_slug: currentBrandSlug, created_at: new Date().toISOString() }];
          }
        }
        setUserBrands(brands);
      } else {
        setUser(null);
        setProfile(null);
        setUserBrands([]);
        setSession(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar estado do usuário:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchCustomerBrands]);

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
      try {
        await updateUserState(session);
      } catch (error) {
        console.error('Erro no listener de autenticação:', error);
      }
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
        const targetSlug = brandSlug || 'sesh';
        const newBrandName = BRAND_CONFIGS[targetSlug]?.name || targetSlug;

        // Buscar usuário existente por email
        const { data: existingUser } = await supabase
          .from('customer_profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingUser) {
          // Buscar marcas onde já está vinculado
          const { data: existingBrandsData } = await supabase
            .from('customer_brands')
            .select('brand_slug')
            .eq('user_id', existingUser.id);

          const existingBrandSlugs = (existingBrandsData || []).map(b => b.brand_slug);
          const existingBrandNames = existingBrandSlugs.map(
            slug => BRAND_CONFIGS[slug]?.name || slug
          );

          // Verificar se já está vinculado a esta marca
          if (existingBrandSlugs.includes(targetSlug)) {
            return {
              error: {
                message: 'Você já possui cadastro! Use "Entrar" para acessar com sua senha.'
              } as AuthError,
              linked: {
                existingBrands: existingBrandNames,
                newBrand: newBrandName,
                alreadyLinked: true,
              },
            };
          }

          // Associar cliente à nova marca
          const { error: brandError } = await supabase
            .from('customer_brands')
            .insert({
              user_id: existingUser.id,
              brand_slug: targetSlug,
            });

          if (brandError && !brandError.message.includes('duplicate')) {
            console.error('Erro ao associar marca:', brandError);
            return {
              error: {
                message: 'Erro ao associar à marca. Entre com sua senha para acessar.'
              } as AuthError,
            };
          }

          // Vinculação feita com sucesso
          return {
            error: null,
            linked: {
              existingBrands: existingBrandNames,
              newBrand: newBrandName,
              alreadyLinked: false,
            },
          };
        }

        // Usuário existe no Auth mas não tem customer_profiles ainda (legado).
        // Ao fazer login, o perfil será criado e a marca vinculada automaticamente.
        return {
          error: {
            message: `Você já possui cadastro! Use "Entrar" para acessar. Ao entrar, sua conta será vinculada à ${newBrandName} automaticamente.`
          } as AuthError,
          linked: {
            existingBrands: [],
            newBrand: newBrandName,
            alreadyLinked: true,
          },
        };
      }

      if (error) return { error };

      // Criar perfil do cliente na tabela customer_profiles
      // Usa upsert para evitar conflito com onAuthStateChange que roda em paralelo
      if (data.user) {
        const { error: profileError } = await supabase
          .from('customer_profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: displayName,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }

        // Associar cliente à marca
        const { error: brandError } = await supabase
          .from('customer_brands')
          .upsert({
            user_id: data.user.id,
            brand_slug: brandSlug || 'sesh',
          }, { onConflict: 'user_id,brand_slug' });

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
    // Limpar estado local imediatamente para não depender do onAuthStateChange
    setUser(null);
    setProfile(null);
    setUserBrands([]);
    setSession(null);
    // Limpar cache do React Query (pedidos, favoritos, perfil, etc.)
    queryClient.clear();
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
        fetchCustomerBrands(user.id),
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
