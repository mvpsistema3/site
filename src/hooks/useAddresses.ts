import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

type AddressCreateData = Omit<CustomerAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type AddressUpdateData = Partial<AddressCreateData>;

export function useAddresses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['customer-addresses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAddress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: AddressCreateData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({ ...address, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as CustomerAddress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', user?.id] });
    },
  });
}

export function useUpdateAddress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AddressUpdateData }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('customer_addresses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomerAddress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', user?.id] });
    },
  });
}

export function useDeleteAddress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', user?.id] });
    },
  });
}

export async function fetchAddressByCep(cep: string) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch {
    return null;
  }
}
