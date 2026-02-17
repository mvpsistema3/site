import { useState, useCallback } from 'react';
import { ViaCEPService, ViaCEPAddress } from '../lib/viaCep';

interface UseViaCepReturn {
  address: ViaCEPAddress | null;
  loading: boolean;
  error: string | null;
  searchCEP: (cep: string) => Promise<void>;
  clearAddress: () => void;
  formatCEP: (cep: string) => string;
  validateCEP: (cep: string) => boolean;
}

export function useViaCep(): UseViaCepReturn {
  const [address, setAddress] = useState<ViaCEPAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCEP = useCallback(async (cep: string) => {
    // Limpar estados anteriores
    setError(null);
    setAddress(null);

    // Validar CEP
    if (!ViaCEPService.validateCEP(cep)) {
      setError('CEP inválido. Digite 8 números.');
      return;
    }

    setLoading(true);

    try {
      const result = await ViaCEPService.getAddress(cep);
      setAddress(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao buscar CEP');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAddress = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  const formatCEP = useCallback((cep: string) => {
    return ViaCEPService.displayCEP(cep);
  }, []);

  const validateCEP = useCallback((cep: string) => {
    return ViaCEPService.validateCEP(cep);
  }, []);

  return {
    address,
    loading,
    error,
    searchCEP,
    clearAddress,
    formatCEP,
    validateCEP,
  };
}