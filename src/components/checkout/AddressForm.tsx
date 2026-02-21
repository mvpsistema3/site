import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { MapPin, Check, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCheckoutStore } from '../../hooks/useCheckout';
import { useViaCep } from '../../hooks/useViaCep';
import { useAddresses, useCreateAddress } from '../../hooks/useAddresses';
import { useBrandColors } from '../../hooks/useTheme';
import type { ShippingAddressData } from '../../types/checkout.types';

interface AddressFormValues {
  recipient_name: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface AddressFormProps {
  onAddressReady: (address: ShippingAddressData) => void;
}

export function AddressForm({ onAddressReady }: AddressFormProps) {
  const { user } = useAuth();
  const { formData, setSavedAddressId } = useCheckoutStore();
  const { primaryColor } = useBrandColors();
  const { address: viaCepAddress, loading: viaCepLoading, searchCEP } = useViaCep();
  const { data: savedAddresses } = useAddresses();
  const createAddress = useCreateAddress();

  const [useNewAddress, setUseNewAddress] = useState(!user || !savedAddresses?.length);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(
    formData.savedAddressId
  );
  const [saveAddress, setSaveAddress] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid },
  } = useForm<AddressFormValues>({
    defaultValues: {
      recipient_name: formData.shippingAddress?.recipient_name || formData.customerInfo?.name || '',
      cep: formData.shippingAddress?.cep || '',
      street: formData.shippingAddress?.street || '',
      number: formData.shippingAddress?.number || '',
      complement: formData.shippingAddress?.complement || '',
      neighborhood: formData.shippingAddress?.neighborhood || '',
      city: formData.shippingAddress?.city || '',
      state: formData.shippingAddress?.state || '',
    },
    mode: 'onBlur',
  });

  const cepValue = watch('cep');

  // Auto-lookup CEP
  useEffect(() => {
    const digits = cepValue?.replace(/\D/g, '') || '';
    if (digits.length === 8) {
      searchCEP(digits);
    }
  }, [cepValue, searchCEP]);

  // Auto-fill from ViaCEP
  useEffect(() => {
    if (viaCepAddress && !viaCepAddress.erro) {
      if (viaCepAddress.logradouro) setValue('street', viaCepAddress.logradouro);
      if (viaCepAddress.bairro) setValue('neighborhood', viaCepAddress.bairro);
      if (viaCepAddress.localidade) setValue('city', viaCepAddress.localidade);
      if (viaCepAddress.uf) setValue('state', viaCepAddress.uf);
      trigger(['street', 'neighborhood', 'city', 'state']);
    }
  }, [viaCepAddress, setValue, trigger]);

  // CEP mask
  useEffect(() => {
    if (cepValue) {
      const digits = cepValue.replace(/\D/g, '').substring(0, 8);
      const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
      if (formatted !== cepValue) setValue('cep', formatted);
    }
  }, [cepValue, setValue]);

  // When saved addresses load, show list but don't auto-select.
  // User must click an address to trigger shipping calculation.
  useEffect(() => {
    if (savedAddresses?.length) {
      setUseNewAddress(false);
    }
  }, [savedAddresses]);

  const handleSelectSaved = (id: string) => {
    const addr = savedAddresses?.find((a) => a.id === id);
    if (!addr) return;
    setSelectedSavedId(id);
    setUseNewAddress(false);
    setSavedAddressId(id);
    onAddressReady({
      recipient_name: addr.recipient_name || formData.customerInfo?.name || '',
      cep: addr.cep,
      street: addr.street,
      number: addr.number,
      complement: addr.complement || undefined,
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
    });
  };

  const handleNewAddressSubmit = async (data: AddressFormValues) => {
    const address: ShippingAddressData = {
      recipient_name: data.recipient_name.trim(),
      cep: data.cep.replace(/\D/g, ''),
      street: data.street.trim(),
      number: data.number.trim(),
      complement: data.complement?.trim() || undefined,
      neighborhood: data.neighborhood.trim(),
      city: data.city.trim(),
      state: data.state.trim().toUpperCase(),
    };

    // Optionally save address for logged-in users
    if (user && saveAddress) {
      try {
        await createAddress.mutateAsync({
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement || null,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          recipient_name: address.recipient_name,
          label: 'Novo endereço',
        } as any);
      } catch {
        // Non-blocking — address save failure shouldn't block checkout
      }
    }

    setSavedAddressId(null);
    onAddressReady(address);
  };

  const hasSavedAddresses = user && savedAddresses && savedAddresses.length > 0;

  const inputClassName =
    'w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
      <h2 className="text-lg font-bold uppercase tracking-wide mb-6">Endereço de entrega</h2>

      {/* Saved addresses */}
      {hasSavedAddresses && (
        <div className="space-y-3 mb-6">
          {savedAddresses.map((addr) => (
            <motion.button
              key={addr.id}
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectSaved(addr.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedSavedId === addr.id && !useNewAddress
                  ? 'shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              style={
                selectedSavedId === addr.id && !useNewAddress
                  ? { borderColor: primaryColor, backgroundColor: `${primaryColor}05` }
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={
                      selectedSavedId === addr.id && !useNewAddress
                        ? { backgroundColor: `${primaryColor}12`, color: primaryColor }
                        : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                    }
                  >
                    <MapPin size={14} />
                  </div>
                  <span className="font-semibold text-sm">{addr.label || 'Endereço'}</span>
                  {addr.is_default && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                      style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                    >
                      Padrão
                    </span>
                  )}
                </div>
                {selectedSavedId === addr.id && !useNewAddress && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <Check size={18} style={{ color: primaryColor }} />
                  </motion.div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 ml-10">
                {addr.street}, {addr.number}
                {addr.complement ? ` - ${addr.complement}` : ''} — {addr.neighborhood}, {addr.city}/{addr.state}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 ml-10">CEP: {addr.cep}</p>
            </motion.button>
          ))}

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setUseNewAddress(true);
              setSelectedSavedId(null);
            }}
            className={`w-full p-4 rounded-xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
              useNewAddress ? 'shadow-sm' : 'border-gray-300 text-gray-400 hover:border-gray-400'
            }`}
            style={useNewAddress ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}05` } : undefined}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={
                useNewAddress
                  ? { backgroundColor: `${primaryColor}15` }
                  : { backgroundColor: '#f3f4f6' }
              }
            >
              <Plus size={14} />
            </div>
            Novo endereço
          </motion.button>
        </div>
      )}

      {/* New address form */}
      {(useNewAddress || !hasSavedAddresses) && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          onSubmit={handleSubmit(handleNewAddressSubmit)}
          id="address-form"
          className="space-y-4"
        >
          {/* Recipient name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Destinatário</label>
            <input
              {...register('recipient_name', { required: 'Nome do destinatário é obrigatório' })}
              placeholder="Nome de quem vai receber"
              className={inputClassName}
              style={{ '--tw-ring-color': `${primaryColor}30` } as any}
            />
            {errors.recipient_name && <p className="mt-1.5 text-xs text-red-500">{errors.recipient_name.message}</p>}
          </div>

          {/* CEP */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">CEP</label>
            <div className="relative">
              <input
                {...register('cep', {
                  required: 'CEP é obrigatório',
                  validate: (v) => v.replace(/\D/g, '').length === 8 || 'CEP deve ter 8 dígitos',
                })}
                placeholder="00000-000"
                inputMode="numeric"
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
              {viaCepLoading && (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>
            {errors.cep && <p className="mt-1.5 text-xs text-red-500">{errors.cep.message}</p>}
          </div>

          {/* Street + Number */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Rua</label>
              <input
                {...register('street', { required: 'Rua é obrigatória' })}
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
              {errors.street && <p className="mt-1.5 text-xs text-red-500">{errors.street.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Número</label>
              <input
                {...register('number', { required: 'Número é obrigatório' })}
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
              {errors.number && <p className="mt-1.5 text-xs text-red-500">{errors.number.message}</p>}
            </div>
          </div>

          {/* Complement + Neighborhood */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Complemento</label>
              <input
                {...register('complement')}
                placeholder="Apto, bloco, etc."
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Bairro</label>
              <input
                {...register('neighborhood', { required: 'Bairro é obrigatório' })}
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
              {errors.neighborhood && <p className="mt-1.5 text-xs text-red-500">{errors.neighborhood.message}</p>}
            </div>
          </div>

          {/* City + State */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Cidade</label>
              <input
                {...register('city', { required: 'Cidade é obrigatória' })}
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
              {errors.city && <p className="mt-1.5 text-xs text-red-500">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">UF</label>
              <input
                {...register('state', {
                  required: 'UF é obrigatório',
                  maxLength: { value: 2, message: 'Use a sigla (ex: RJ)' },
                })}
                maxLength={2}
                placeholder="RJ"
                className={`${inputClassName} uppercase`}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
              {errors.state && <p className="mt-1.5 text-xs text-red-500">{errors.state.message}</p>}
            </div>
          </div>

          {/* Save address checkbox (logged in only) */}
          {user && (
            <label className="flex items-center gap-2.5 text-sm text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="rounded border-gray-300"
                style={{ accentColor: primaryColor }}
              />
              Salvar este endereço para próximas compras
            </label>
          )}

          {/* Submit button */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <MapPin size={16} />
            Usar este endereço
          </motion.button>
        </motion.form>
      )}
    </div>
  );
}
