import React from 'react';
import { useFeatureFlag, FeatureFlagKey } from '../hooks/useFeatureFlag';

interface FeatureFlagProps {
  feature: FeatureFlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoader?: boolean;
}

/**
 * Componente que renderiza children apenas se a feature estiver habilitada
 * @example
 * <FeatureFlag feature="reviews">
 *   <ProductReviews product={product} />
 * </FeatureFlag>
 */
export const FeatureFlag: React.FC<FeatureFlagProps> = ({
  feature,
  children,
  fallback = null,
  showLoader = false,
}) => {
  const { isEnabled, isLoading } = useFeatureFlag(feature);

  if (isLoading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

interface MultiFeatureFlagProps {
  features: FeatureFlagKey[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente que renderiza baseado em múltiplas features
 * @example
 * <MultiFeatureFlag features={['loyalty', 'reviews']} requireAll={true}>
 *   <LoyaltyReviewsSection />
 * </MultiFeatureFlag>
 */
export const MultiFeatureFlag: React.FC<MultiFeatureFlagProps> = ({
  features,
  requireAll = false,
  children,
  fallback = null,
}) => {
  const { features: allFeatures } = useFeatureFlag();

  const enabledFeatures = features.filter(f => allFeatures[f]);

  const shouldRender = requireAll
    ? enabledFeatures.length === features.length
    : enabledFeatures.length > 0;

  return shouldRender ? <>{children}</> : <>{fallback}</>;
};

interface FeatureSwitchCase {
  feature: FeatureFlagKey;
  component: React.ReactNode;
}

interface FeatureSwitchProps {
  cases: FeatureSwitchCase[];
  default?: React.ReactNode;
}

/**
 * Componente que renderiza diferentes componentes baseado na primeira feature habilitada
 * @example
 * <FeatureSwitch
 *   cases={[
 *     { feature: 'virtualTryOn', component: <VirtualTryOn /> },
 *     { feature: 'sizeGuide', component: <SizeGuide /> },
 *   ]}
 *   default={<BasicProductInfo />}
 * />
 */
export const FeatureSwitch: React.FC<FeatureSwitchProps> = ({
  cases,
  default: defaultComponent = null,
}) => {
  const { features } = useFeatureFlag();

  for (const { feature, component } of cases) {
    if (features[feature]) {
      return <>{component}</>;
    }
  }

  return <>{defaultComponent}</>;
};