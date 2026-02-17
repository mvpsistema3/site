/**
 * useShipping Hook
 * Hook customizado para gerenciar cálculo e seleção de frete
 */

import { useState, useCallback } from 'react';
import { FrenetService } from '../lib/frenet.service';
import {
  FrenetShippingService,
  ShippingCalculateParams,
  ShippingState,
} from '../types/shipping.types';

/**
 * Hook para cálculo e gerenciamento de frete
 *
 * @returns Estado e funções para trabalhar com frete
 *
 * @example
 * const { options, loading, error, calculateShipping, selectService } = useShipping();
 *
 * // Calcular frete
 * await calculateShipping({ destinationCEP: '01310100', invoiceValue: 150 });
 *
 * // Selecionar opção
 * selectService(options[0]);
 */
export function useShipping() {
  const [state, setState] = useState<ShippingState>({
    options: [],
    loading: false,
    error: null,
    selectedService: null,
  });

  /**
   * Calcula as opções de frete disponíveis
   */
  const calculateShipping = useCallback(async (params: ShippingCalculateParams) => {
    // Reset state e inicia loading
    setState({
      options: [],
      loading: true,
      error: null,
      selectedService: null,
    });

    try {
      const services = await FrenetService.calculateShipping(params);

      setState({
        options: services,
        loading: false,
        error: null,
        selectedService: null,
      });

      return services;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao calcular frete';

      setState({
        options: [],
        loading: false,
        error: errorMessage,
        selectedService: null,
      });

      throw error;
    }
  }, []);

  /**
   * Seleciona um serviço de frete
   */
  const selectService = useCallback((service: FrenetShippingService | null) => {
    setState((prev) => ({
      ...prev,
      selectedService: service,
    }));
  }, []);

  /**
   * Limpa o estado (reseta o hook)
   */
  const reset = useCallback(() => {
    setState({
      options: [],
      loading: false,
      error: null,
      selectedService: null,
    });
  }, []);

  /**
   * Limpa apenas o erro
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Obtém o serviço mais barato disponível
   */
  const getCheapestOption = useCallback(() => {
    return FrenetService.getCheapestService(state.options);
  }, [state.options]);

  /**
   * Obtém o serviço mais rápido disponível
   */
  const getFastestOption = useCallback(() => {
    return FrenetService.getFastestService(state.options);
  }, [state.options]);

  /**
   * Verifica se há opções disponíveis
   */
  const hasOptions = state.options.length > 0;

  /**
   * Verifica se algum serviço foi selecionado
   */
  const hasSelection = state.selectedService !== null;

  return {
    // Estado
    options: state.options,
    loading: state.loading,
    error: state.error,
    selectedService: state.selectedService,

    // Flags
    hasOptions,
    hasSelection,

    // Ações
    calculateShipping,
    selectService,
    reset,
    clearError,

    // Helpers
    getCheapestOption,
    getFastestOption,
  };
}

/**
 * Hook para persistir seleção de frete no localStorage
 * Útil para manter a seleção entre navegações
 *
 * @param cartId - ID do carrinho para isolar a seleção
 */
export function usePersistedShipping(cartId: string = 'default') {
  const shipping = useShipping();
  const storageKey = `shipping-${cartId}`;

  /**
   * Salva serviço selecionado no localStorage
   */
  const selectAndPersist = useCallback(
    (service: FrenetShippingService | null) => {
      shipping.selectService(service);

      if (service) {
        localStorage.setItem(storageKey, JSON.stringify(service));
      } else {
        localStorage.removeItem(storageKey);
      }
    },
    [shipping, storageKey]
  );

  /**
   * Carrega serviço salvo do localStorage
   */
  const loadPersistedService = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const service = JSON.parse(saved) as FrenetShippingService;
        shipping.selectService(service);
        return service;
      }
    } catch (error) {
      console.error('Erro ao carregar frete salvo:', error);
    }
    return null;
  }, [shipping, storageKey]);

  /**
   * Limpa frete salvo
   */
  const clearPersistedService = useCallback(() => {
    localStorage.removeItem(storageKey);
    shipping.reset();
  }, [shipping, storageKey]);

  return {
    ...shipping,
    selectService: selectAndPersist,
    loadPersistedService,
    clearPersistedService,
  };
}
