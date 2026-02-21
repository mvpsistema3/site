import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Package, Check, Loader2 } from 'lucide-react';
import { useShipping } from '../../hooks/useShipping';
import { useCartStore } from '../../stores/cartStore';
import { useBrand } from '../../contexts/BrandContext';
import { useBrandColors } from '../../hooks/useTheme';
import { formatCurrency } from '../../lib/currency.utils';
import type { ShippingSelectionData } from '../../types/checkout.types';
import type { FrenetShippingService } from '../../types/shipping.types';

interface ShippingMethodSelectorProps {
  cep: string;
  onShippingReady: (data: ShippingSelectionData) => void;
}

export function ShippingMethodSelector({ cep, onShippingReady }: ShippingMethodSelectorProps) {
  const { primaryColor } = useBrandColors();
  const { brandConfig } = useBrand();
  const cartSubtotal = useCartStore((s) => s.cartSubtotal);
  const cartSetShipping = useCartStore((s) => s.setShipping);

  const {
    options,
    loading,
    error,
    selectedService,
    calculateShipping,
    selectService,
  } = useShipping();

  const freeShippingThreshold = brandConfig?.settings?.freeShippingThreshold || 0;
  const qualifiesForFreeShipping = freeShippingThreshold > 0 && cartSubtotal >= freeShippingThreshold;

  // Calculate shipping when CEP is provided
  useEffect(() => {
    const digits = cep?.replace(/\D/g, '') || '';
    if (digits.length === 8 && cartSubtotal > 0) {
      calculateShipping({ destinationCEP: digits, invoiceValue: cartSubtotal });
    }
  }, [cep, cartSubtotal, calculateShipping]);

  const handleSelect = (service: FrenetShippingService) => {
    selectService(service);
    cartSetShipping(service);

    const cost = qualifiesForFreeShipping ? 0 : parseFloat(service.ShippingPrice) || 0;
    onShippingReady({
      service_name: service.ServiceDescription || service.Carrier,
      cost,
      delivery_days: parseInt(service.DeliveryTime) || 0,
    });
  };

  if (!cep || cep.replace(/\D/g, '').length < 8) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
      <h3 className="text-lg font-bold uppercase tracking-wide mb-5">Frete</h3>

      {loading && (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          <span className="text-sm">Calculando frete...</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 py-4">{error}</p>
      )}

      {!loading && options.length > 0 && (
        <div className="space-y-3">
          {options
            .filter((o) => !o.Error)
            .map((service) => {
              const isSelected = selectedService?.ServiceCode === service.ServiceCode;
              const price = parseFloat(service.ShippingPrice) || 0;
              const isFree = qualifiesForFreeShipping;
              const Icon = service.ServiceDescription?.includes('SEDEX') ? Truck : Package;

              return (
                <motion.button
                  key={service.ServiceCode}
                  type="button"
                  onClick={() => handleSelect(service)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected ? 'shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  style={
                    isSelected
                      ? { borderColor: primaryColor, backgroundColor: `${primaryColor}05` }
                      : undefined
                  }
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200"
                        style={
                          isSelected
                            ? { backgroundColor: `${primaryColor}12`, color: primaryColor }
                            : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                        }
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="font-semibold text-sm">
                          {service.ServiceDescription || service.Carrier}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {service.DeliveryTime} dias úteis
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {isFree ? (
                          <>
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(price)}
                            </span>
                            <span className="block text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Grátis
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold">
                            {formatCurrency(price)}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        >
                          <Check size={18} style={{ color: primaryColor }} />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}

          {qualifiesForFreeShipping && (
            <p className="text-xs text-green-600 text-center font-medium mt-2">
              Frete grátis para compras acima de {formatCurrency(freeShippingThreshold)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
