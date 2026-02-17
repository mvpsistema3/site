/**
 * FrenetService
 * Serviço para cálculo de frete via API Frenet
 * Utiliza Supabase Edge Function para proteger o token da API
 */

import { supabase } from './supabase';
import { ViaCEPService } from './viaCep';
import {
  FrenetQuoteResponse,
  FrenetShippingService,
  ShippingCalculateParams,
  SHIPPING_ERROR_MESSAGES,
} from '../types/shipping.types';

export class FrenetService {
  /**
   * URL da Edge Function do Supabase
   * A edge function faz a comunicação real com a API Frenet,
   * protegendo o token no servidor
   */
  private static readonly EDGE_FUNCTION_NAME = 'calculate-shipping';

  /**
   * Calcula as opções de frete disponíveis
   *
   * @param params - CEP de destino e valor da nota fiscal
   * @returns Promise com array de serviços de entrega disponíveis
   * @throws Error se o CEP for inválido ou a API falhar
   */
  static async calculateShipping(
    params: ShippingCalculateParams
  ): Promise<FrenetShippingService[]> {
    const { destinationCEP, invoiceValue } = params;

    // Limpar e validar CEP
    const cleanedCEP = ViaCEPService.formatCEP(destinationCEP);

    if (!ViaCEPService.validateCEP(cleanedCEP)) {
      throw new Error(SHIPPING_ERROR_MESSAGES.INVALID_CEP);
    }

    // Validar valor
    if (!invoiceValue || invoiceValue <= 0) {
      throw new Error(SHIPPING_ERROR_MESSAGES.INVALID_CART_VALUE);
    }

    try {
      console.log('[FrenetService] Calculando frete para CEP:', cleanedCEP);

      // Chamar Edge Function do Supabase
      const { data, error } = await supabase.functions.invoke<FrenetQuoteResponse>(
        this.EDGE_FUNCTION_NAME,
        {
          body: {
            recipientCEP: cleanedCEP,
            invoiceValue: invoiceValue,
          },
        }
      );

      if (error) {
        console.error('[FrenetService] Erro ao chamar edge function:', error);

        // Tratar erros específicos
        if (error.message?.includes('timeout') || error.message?.includes('504')) {
          throw new Error(SHIPPING_ERROR_MESSAGES.TIMEOUT);
        }

        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          throw new Error(SHIPPING_ERROR_MESSAGES.NETWORK_ERROR);
        }

        throw new Error(SHIPPING_ERROR_MESSAGES.API_ERROR);
      }

      if (!data) {
        throw new Error(SHIPPING_ERROR_MESSAGES.API_ERROR);
      }

      // Validar resposta
      if (!data.ShippingSevicesArray || data.ShippingSevicesArray.length === 0) {
        throw new Error(SHIPPING_ERROR_MESSAGES.NO_RESULTS);
      }

      // Filtrar apenas serviços sem erro
      const validServices = data.ShippingSevicesArray.filter(
        (service) => !service.Error
      );

      if (validServices.length === 0) {
        throw new Error(SHIPPING_ERROR_MESSAGES.NO_RESULTS);
      }

      console.log('[FrenetService] Frete calculado com sucesso:', {
        opcoes: validServices.length,
        servicos: validServices.map(s => s.ServiceDescription).join(', ')
      });

      return validServices;

    } catch (error) {
      console.error('[FrenetService] Erro ao calcular frete:', error);

      // Se já for um erro conhecido, propagar
      if (error instanceof Error && Object.values(SHIPPING_ERROR_MESSAGES).includes(error.message as any)) {
        throw error;
      }

      // Timeout do fetch
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(SHIPPING_ERROR_MESSAGES.TIMEOUT);
      }

      // Erro de rede
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new Error(SHIPPING_ERROR_MESSAGES.NETWORK_ERROR);
      }

      // Erro genérico
      throw new Error(SHIPPING_ERROR_MESSAGES.API_ERROR);
    }
  }

  /**
   * Formata o preço do frete para exibição
   * Converte de string para número e formata em reais
   *
   * @param price - Preço como string (ex: "31.71")
   * @returns Preço formatado (ex: "R$ 31,71")
   */
  static formatShippingPrice(price: string | number): string {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

    if (isNaN(numericPrice)) {
      return 'R$ 0,00';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numericPrice);
  }

  /**
   * Formata o prazo de entrega
   *
   * @param days - Número de dias úteis
   * @returns Texto formatado (ex: "3 dias úteis")
   */
  static formatDeliveryTime(days: string | number): string {
    const numericDays = typeof days === 'string' ? parseInt(days, 10) : days;

    if (isNaN(numericDays)) {
      return 'Prazo não disponível';
    }

    if (numericDays === 1) {
      return '1 dia útil';
    }

    return `${numericDays} dias úteis`;
  }

  /**
   * Calcula a estimativa de data de entrega
   * Considera apenas dias úteis (segunda a sexta)
   *
   * @param deliveryTime - Prazo em dias úteis
   * @returns Data estimada de entrega
   */
  static calculateDeliveryDate(deliveryTime: string | number): Date {
    const days = typeof deliveryTime === 'string' ? parseInt(deliveryTime, 10) : deliveryTime;

    if (isNaN(days) || days < 0) {
      return new Date();
    }

    const today = new Date();
    let businessDays = 0;
    let currentDate = new Date(today);

    while (businessDays < days) {
      currentDate.setDate(currentDate.getDate() + 1);

      // Pular finais de semana (0 = domingo, 6 = sábado)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }

    return currentDate;
  }

  /**
   * Formata data de entrega para exibição
   *
   * @param date - Data de entrega
   * @returns Texto formatado (ex: "até 15/02/2026")
   */
  static formatDeliveryDate(date: Date): string {
    return `até ${date.toLocaleDateString('pt-BR')}`;
  }

  /**
   * Obtém o serviço de frete mais barato
   *
   * @param services - Array de serviços disponíveis
   * @returns Serviço com menor preço
   */
  static getCheapestService(
    services: FrenetShippingService[]
  ): FrenetShippingService | null {
    if (!services || services.length === 0) {
      return null;
    }

    return services.reduce((cheapest, current) => {
      const cheapestPrice = parseFloat(cheapest.ShippingPrice);
      const currentPrice = parseFloat(current.ShippingPrice);

      return currentPrice < cheapestPrice ? current : cheapest;
    });
  }

  /**
   * Obtém o serviço de frete mais rápido
   *
   * @param services - Array de serviços disponíveis
   * @returns Serviço com menor prazo
   */
  static getFastestService(
    services: FrenetShippingService[]
  ): FrenetShippingService | null {
    if (!services || services.length === 0) {
      return null;
    }

    return services.reduce((fastest, current) => {
      const fastestDays = parseInt(fastest.DeliveryTime, 10);
      const currentDays = parseInt(current.DeliveryTime, 10);

      return currentDays < fastestDays ? current : fastest;
    });
  }
}
