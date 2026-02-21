import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { CreditCard, User, Calendar, Lock, ShieldCheck } from 'lucide-react';
import {
  detectCardBrand,
  isValidLuhn,
  formatCardNumber,
  formatExpiry,
  getCvvLength,
  type CardBrand,
} from '../../lib/credit-card';
import { useBrandColors } from '../../hooks/useTheme';
import type { CreditCardData } from '../../types/checkout.types';

interface CreditCardFormProps {
  onCardDataChange: (data: CreditCardData | null) => void;
}

interface FormValues {
  number: string;
  holder_name: string;
  expiry: string;
  cvv: string;
}

const BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  elo: 'Elo',
  hipercard: 'Hipercard',
  unknown: '',
};

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export function CreditCardForm({ onCardDataChange }: CreditCardFormProps) {
  const { primaryColor } = useBrandColors();

  const {
    register,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { number: '', holder_name: '', expiry: '', cvv: '' },
  });

  const numberValue = watch('number');
  const expiryValue = watch('expiry');
  const holderName = watch('holder_name');
  const cvv = watch('cvv');

  const brand = detectCardBrand(numberValue);
  const cvvLength = getCvvLength(brand);

  // Auto-format card number
  useEffect(() => {
    if (numberValue) {
      const formatted = formatCardNumber(numberValue);
      if (formatted !== numberValue) setValue('number', formatted, { shouldValidate: true });
    }
  }, [numberValue, setValue]);

  // Auto-format expiry
  useEffect(() => {
    if (expiryValue) {
      const formatted = formatExpiry(expiryValue);
      if (formatted !== expiryValue) setValue('expiry', formatted, { shouldValidate: true });
    }
  }, [expiryValue, setValue]);

  // Notify parent of card data validity
  useEffect(() => {
    const digits = numberValue.replace(/\D/g, '');
    const isNumberValid = isValidLuhn(digits) && digits.length >= 13;
    const isExpiryValid = /^\d{2}\/\d{2}$/.test(expiryValue);
    const isCvvValid = cvv.replace(/\D/g, '').length === cvvLength;
    const isNameValid = holderName.trim().length >= 3;

    if (isNumberValid && isExpiryValid && isCvvValid && isNameValid) {
      onCardDataChange({
        number: digits,
        holder_name: holderName.trim().toUpperCase(),
        expiry: expiryValue,
        cvv: cvv.replace(/\D/g, ''),
      });
    } else {
      onCardDataChange(null);
    }
  }, [numberValue, expiryValue, cvv, holderName, cvvLength, onCardDataChange]);

  const inputClassName =
    'w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="h-1" style={{ backgroundColor: primaryColor }} />
      <div className="p-6 md:p-8 space-y-5">
        <h3 className="text-lg font-bold uppercase tracking-wide">Dados do cartão</h3>

        {/* Card number */}
        <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Número do cartão</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <CreditCard size={14} className="text-gray-400" />
            </div>
            <input
              {...register('number', {
                required: 'Número do cartão é obrigatório',
                validate: (v) => {
                  const d = v.replace(/\D/g, '');
                  if (d.length < 13) return 'Número incompleto';
                  if (!isValidLuhn(d)) return 'Número de cartão inválido';
                  return true;
                },
              })}
              placeholder="0000 0000 0000 0000"
              inputMode="numeric"
              autoComplete="cc-number"
              className={`${inputClassName} pr-24`}
              style={{ '--tw-ring-color': `${primaryColor}30` } as any}
            />
            {brand !== 'unknown' && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
              >
                {BRAND_LABELS[brand]}
              </motion.span>
            )}
          </div>
          {errors.number && <p className="mt-1.5 text-xs text-red-500">{errors.number.message}</p>}
        </motion.div>

        {/* Holder name */}
        <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Nome no cartão</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <User size={14} className="text-gray-400" />
            </div>
            <input
              {...register('holder_name', {
                required: 'Nome é obrigatório',
                minLength: { value: 3, message: 'Nome deve ter pelo menos 3 caracteres' },
              })}
              placeholder="NOME COMO NO CARTÃO"
              autoComplete="cc-name"
              className={`${inputClassName} uppercase`}
              style={{ '--tw-ring-color': `${primaryColor}30` } as any}
            />
          </div>
          {errors.holder_name && <p className="mt-1.5 text-xs text-red-500">{errors.holder_name.message}</p>}
        </motion.div>

        {/* Expiry + CVV */}
        <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Validade</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Calendar size={14} className="text-gray-400" />
              </div>
              <input
                {...register('expiry', {
                  required: 'Validade é obrigatória',
                  validate: (v) => {
                    if (!/^\d{2}\/\d{2}$/.test(v)) return 'Use o formato MM/AA';
                    const [m, y] = v.split('/').map(Number);
                    if (m < 1 || m > 12) return 'Mês inválido';
                    const now = new Date();
                    const expiry = new Date(2000 + y, m);
                    if (expiry < now) return 'Cartão expirado';
                    return true;
                  },
                })}
                placeholder="MM/AA"
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
            </div>
            {errors.expiry && <p className="mt-1.5 text-xs text-red-500">{errors.expiry.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">CVV</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock size={14} className="text-gray-400" />
              </div>
              <input
                {...register('cvv', {
                  required: 'CVV é obrigatório',
                  validate: (v) => {
                    const digits = v.replace(/\D/g, '');
                    return digits.length === cvvLength || `CVV deve ter ${cvvLength} dígitos`;
                  },
                })}
                placeholder={cvvLength === 4 ? '0000' : '000'}
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={cvvLength}
                className={inputClassName}
                style={{ '--tw-ring-color': `${primaryColor}30` } as any}
              />
            </div>
            {errors.cvv && <p className="mt-1.5 text-xs text-red-500">{errors.cvv.message}</p>}
          </div>
        </motion.div>

        <motion.div
          custom={3}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100"
        >
          <ShieldCheck size={14} className="text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-400">
            Seus dados são criptografados e enviados diretamente ao processador de pagamento.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
