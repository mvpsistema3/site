/**
 * Tipos para integração com API Frenet
 * API de cálculo de frete para e-commerce
 */

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Item a ser enviado no cálculo de frete
 */
export interface FrenetShippingItem {
  /** Altura do item em centímetros */
  Height: number;
  /** Comprimento do item em centímetros */
  Length: number;
  /** Quantidade de itens */
  Quantity: number;
  /** Peso do item em quilogramas */
  Weight: number;
  /** Largura do item em centímetros */
  Width: number;
  /** Código SKU do produto */
  SKU: string;
  /** Categoria do produto */
  Category: string;
}

/**
 * Payload completo para requisição de cotação de frete
 */
export interface FrenetQuoteRequest {
  /** CEP do remetente (sem formatação) */
  SellerCEP: string;
  /** CEP do destinatário (sem formatação) */
  RecipientCEP: string;
  /** Valor total da nota fiscal */
  ShipmentInvoiceValue: number;
  /** Código do serviço específico (null para buscar todos) */
  ShippingServiceCode: null;
  /** Array de itens a serem enviados */
  ShippingItemArray: FrenetShippingItem[];
  /** País de destino (padrão: BR) */
  RecipientCountry: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Serviço de entrega retornado pela API
 */
export interface FrenetShippingService {
  /** Nome da transportadora (ex: "Correios") */
  Carrier: string;
  /** Código da transportadora (ex: "COR") */
  CarrierCode: string;
  /** Prazo de entrega em dias úteis (string) */
  DeliveryTime: string;
  /** Mensagem adicional (geralmente vazio) */
  Msg: string;
  /** Código do serviço (ex: "04014" para SEDEX) */
  ServiceCode: string;
  /** Descrição do serviço (ex: "SEDEX") */
  ServiceDescription: string;
  /** Preço do frete (string com valor decimal) */
  ShippingPrice: string;
  /** Prazo original sem adicionais */
  OriginalDeliveryTime: string;
  /** Preço original sem adicionais */
  OriginalShippingPrice: string;
  /** Indica se houve erro neste serviço */
  Error: boolean;
}

/**
 * Resposta completa da API Frenet
 */
export interface FrenetQuoteResponse {
  /** Array de serviços de entrega disponíveis */
  ShippingSevicesArray: FrenetShippingService[];
  /** Timeout da requisição (0 = sem timeout) */
  Timeout: number;
}

// ============================================
// APPLICATION TYPES
// ============================================

/**
 * Parâmetros simplificados para cálculo de frete
 * (usados internamente na aplicação)
 */
export interface ShippingCalculateParams {
  /** CEP de destino (com ou sem formatação) */
  destinationCEP: string;
  /** Valor total do carrinho/pedido */
  invoiceValue: number;
}

/**
 * Props do componente ShippingCalculator
 */
export interface ShippingCalculatorProps {
  /** Valor total do carrinho */
  cartTotal: number;
  /** Callback quando uma opção de frete é selecionada */
  onShippingSelected?: (service: FrenetShippingService) => void;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Props do componente ShippingOption
 */
export interface ShippingOptionProps {
  /** Dados do serviço de entrega */
  service: FrenetShippingService;
  /** Callback quando a opção é selecionada */
  onSelect?: () => void;
  /** Indica se esta opção está selecionada */
  selected?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Estado do hook useShipping
 */
export interface ShippingState {
  /** Opções de frete disponíveis */
  options: FrenetShippingService[];
  /** Indica se está carregando */
  loading: boolean;
  /** Mensagem de erro (null se não houver erro) */
  error: string | null;
  /** Opção de frete selecionada */
  selectedService: FrenetShippingService | null;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Dimensões padrão da caixa usada para todos os pedidos
 */
export const STANDARD_BOX_DIMENSIONS = {
  height: 12,       // cm
  length: 25,       // cm
  width: 15,        // cm
  weight: 0.8,      // kg
  sku: 'CAIXA_PADRAO',
  category: 'Tabacaria'
} as const;

/**
 * CEP de origem (Niterói - RJ)
 */
export const SELLER_CEP = '24330286';

/**
 * Mensagens de erro padronizadas
 */
export const SHIPPING_ERROR_MESSAGES = {
  INVALID_CEP: 'CEP inválido. Digite um CEP com 8 dígitos.',
  API_ERROR: 'Não foi possível calcular o frete. Tente novamente.',
  TIMEOUT: 'O cálculo demorou muito. Tente novamente.',
  NO_RESULTS: 'Nenhuma opção de frete disponível para este CEP.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  INVALID_CART_VALUE: 'Valor do carrinho inválido.',
} as const;
