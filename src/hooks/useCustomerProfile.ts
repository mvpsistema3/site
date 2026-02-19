import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CustomerProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  notification_preferences: {
    email_marketing: boolean;
    promotions: boolean;
    order_updates: boolean;
  };
  created_at: string;
  updated_at: string;
}

type ProfileUpdateData = Partial<Pick<
  CustomerProfile,
  'display_name' | 'phone' | 'cpf' | 'birth_date' | 'gender' | 'notification_preferences'
>>;

export function useCustomerProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Se não encontrou perfil, criar automaticamente
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('customer_profiles')
          .upsert({
            id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
          }, { onConflict: 'id' })
          .select()
          .single();

        if (insertError) throw insertError;
        return newProfile as CustomerProfile;
      }

      return data as CustomerProfile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateCustomerProfile() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileUpdateData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Use upsert to handle cases where profile might not exist yet
      const { data, error } = await supabase
        .from('customer_profiles')
        .upsert({
          id: user.id,
          ...updates,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data as CustomerProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-profile', user?.id] });
      refreshProfile();
    },
  });
}
