import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Mail, Phone, FileText, LogIn } from 'lucide-react';
import { isValidCPF, formatCPF, stripCPF } from '../../lib/cpf';
import { formatPhone } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useCheckoutStore } from '../../hooks/useCheckout';
import { useBrandColors } from '../../hooks/useTheme';
import { useUIStore } from '../../stores/uiStore';
import type { CustomerInfoData } from '../../types/checkout.types';

interface FormValues {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

const fieldVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export function CustomerInfoForm() {
  const { user, profile } = useAuth();
  const { formData, setCustomerInfo, goToNextStep } = useCheckoutStore();
  const { primaryColor } = useBrandColors();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: formData.customerInfo?.name || profile?.display_name || '',
      email: formData.customerInfo?.email || profile?.email || '',
      cpf: formData.customerInfo?.cpf
        ? formatCPF(formData.customerInfo.cpf)
        : profile?.cpf
          ? formatCPF(profile.cpf)
          : '',
      phone: formData.customerInfo?.phone
        ? formatPhone(formData.customerInfo.phone)
        : profile?.phone
          ? formatPhone(profile.phone)
          : '',
    },
  });

  // Pre-fill from profile when it loads asynchronously (after page refresh)
  useEffect(() => {
    if (!profile) return;
    // Only fill fields that are still empty (don't overwrite user edits or persisted data)
    const current = watch();
    if (!current.name && profile.display_name) setValue('name', profile.display_name);
    if (!current.email && profile.email) setValue('email', profile.email);
    if (!current.cpf && profile.cpf) setValue('cpf', formatCPF(profile.cpf));
    if (!current.phone && profile.phone) setValue('phone', formatPhone(profile.phone));
  }, [profile, setValue, watch]);

  // Input masking
  const cpfValue = watch('cpf');
  const phoneValue = watch('phone');

  useEffect(() => {
    if (cpfValue) {
      const digits = cpfValue.replace(/\D/g, '').substring(0, 11);
      const formatted = formatCPF(digits);
      if (formatted !== cpfValue) setValue('cpf', formatted, { shouldValidate: true });
    }
  }, [cpfValue, setValue]);

  useEffect(() => {
    if (phoneValue) {
      const digits = phoneValue.replace(/\D/g, '').substring(0, 11);
      const formatted = formatPhone(digits);
      if (formatted !== phoneValue) setValue('phone', formatted, { shouldValidate: true });
    }
  }, [phoneValue, setValue]);

  const onSubmit = (data: FormValues) => {
    const info: CustomerInfoData = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      cpf: stripCPF(data.cpf),
      phone: data.phone.replace(/\D/g, ''),
    };
    setCustomerInfo(info);
    goToNextStep();
  };

  const handleOpenLogin = () => {
    useUIStore.getState().openLoginModal();
  };

  const inputClassName =
    'w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-2';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
      <h2 className="text-lg font-bold uppercase tracking-wide mb-6">Seus dados</h2>

      {/* Guest login prompt */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-200 flex items-center justify-between"
        >
          <span className="text-sm text-gray-500">Ja tem conta?</span>
          <button
            type="button"
            onClick={handleOpenLogin}
            className="flex items-center gap-2 text-sm font-bold hover:underline underline-offset-4 transition-colors"
            style={{ color: primaryColor }}
          >
            <LogIn size={16} />
            Fazer login
          </button>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            Nome completo
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <User size={14} className="text-gray-400" />
            </div>
            <input
              {...register('name', {
                required: 'Nome e obrigatorio',
                minLength: { value: 3, message: 'Nome deve ter pelo menos 3 caracteres' },
              })}
              placeholder="Seu nome completo"
              className={inputClassName}
              style={{ '--tw-ring-color': `${primaryColor}30` } as any}
            />
          </div>
          {errors.name && (
            <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
          )}
        </motion.div>

        {/* Email */}
        <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            E-mail
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <Mail size={14} className="text-gray-400" />
            </div>
            <input
              {...register('email', {
                required: 'E-mail e obrigatorio',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'E-mail invalido',
                },
              })}
              type="email"
              placeholder="seu@email.com"
              className={inputClassName}
              style={{ '--tw-ring-color': `${primaryColor}30` } as any}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
          )}
        </motion.div>

        {/* CPF */}
        <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            CPF
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText size={14} className="text-gray-400" />
            </div>
            <input
              {...register('cpf', {
                required: 'CPF e obrigatorio',
                validate: (v) => isValidCPF(v) || 'CPF invalido',
              })}
              placeholder="000.000.000-00"
              inputMode="numeric"
              className={inputClassName}
              style={{ '--tw-ring-color': `${primaryColor}30` } as any}
            />
          </div>
          {errors.cpf && (
            <p className="mt-1.5 text-xs text-red-500">{errors.cpf.message}</p>
          )}
        </motion.div>

        {/* Phone */}
        <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            Telefone
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <Phone size={14} className="text-gray-400" />
            </div>
            <input
              {...register('phone', {
                required: 'Telefone e obrigatorio',
                validate: (v) => {
                  const digits = v.replace(/\D/g, '');
                  return digits.length >= 10 || 'Telefone deve ter pelo menos 10 digitos';
                },
              })}
              placeholder="(21) 99999-9999"
              inputMode="tel"
              className={inputClassName}
              style={{ '--tw-ring-color': `${primaryColor}30` } as any}
            />
          </div>
          {errors.phone && (
            <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>
          )}
        </motion.div>

        <motion.button
          custom={4}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="w-full py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide hover:opacity-90 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          Continuar
        </motion.button>
      </form>
    </div>
  );
}
