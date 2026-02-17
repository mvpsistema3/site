import { useBrand } from '../contexts/BrandContext';

// Tipos de features disponíveis
export type FeatureFlagKey =
  | 'loyalty'
  | 'reviews'
  | 'giftCards'
  | 'installments'
  | 'wishlist'
  | 'quickBuy'
  | 'sizeGuide'
  | 'socialSharing'
  | 'productComparison'
  | 'recentlyViewed'
  | 'abandonedCartRecovery'
  | 'productRecommendations'
  | 'liveChat'
  | 'virtualTryOn'
  | 'referralProgram';

interface UseFeatureFlagReturn {
  isEnabled: boolean;
  isLoading: boolean;
  features: Record<string, boolean>;
}

/**
 * Hook para verificar se uma feature está habilitada para a marca atual
 * @param featureKey - Chave da feature a ser verificada
 * @returns Objeto com status da feature e loading
 */
export const useFeatureFlag = (featureKey?: FeatureFlagKey): UseFeatureFlagReturn => {
  const { brand, brandConfig, isLoading } = useBrand();

  // Combina features do banco com features da config local
  const features = {
    ...brandConfig.features,
    ...(brand?.features || {}),
  };

  const isEnabled = featureKey ? Boolean(features[featureKey]) : false;

  return {
    isEnabled,
    isLoading,
    features,
  };
};

/**
 * Hook para verificar múltiplas features de uma vez
 * @param featureKeys - Array de chaves de features
 * @returns Objeto com status de cada feature
 */
export const useFeatureFlags = (featureKeys: FeatureFlagKey[]): Record<FeatureFlagKey, boolean> & { isLoading: boolean } => {
  const { brand, brandConfig, isLoading } = useBrand();

  const features = {
    ...brandConfig.features,
    ...(brand?.features || {}),
  };

  const result: any = { isLoading };

  featureKeys.forEach(key => {
    result[key] = Boolean(features[key]);
  });

  return result;
};

/**
 * Hook para obter todas as features disponíveis
 * @returns Todas as features com seus valores
 */
export const useAllFeatures = () => {
  const { brand, brandConfig, isLoading } = useBrand();

  const features = {
    ...brandConfig.features,
    ...(brand?.features || {}),
  };

  return {
    features,
    isLoading,
  };
};