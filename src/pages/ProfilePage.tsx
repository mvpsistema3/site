import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, MapPin, Pencil, Trash2, Plus,
  Check, X, Loader2, Search, Home, Briefcase, MapPinned,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrandColors } from '../hooks/useTheme';
import { useCustomerProfile, useUpdateCustomerProfile } from '../hooks/useCustomerProfile';
import { AccountLayout } from '../components/AccountLayout';
import {
  useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress,
  fetchAddressByCep, type CustomerAddress,
} from '../hooks/useAddresses';
import { useToastStore } from '../stores/toastStore';

// ─── Helpers ────────────────────────────────────────────

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

const LABEL_ICONS: Record<string, React.ReactNode> = {
  Casa: <Home size={14} />,
  Trabalho: <Briefcase size={14} />,
};

const BR_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

// ─── Skeleton ───────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded bg-gray-200 ${className}`}
      style={{
        background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)',
        backgroundSize: '1000px 100%',
        animation: 'shimmer 2s infinite',
      }}
    />
  );
}

function ProfileSkeleton() {
  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }`}</style>
      <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
        <div className="flex items-center gap-5">
          <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Section Wrapper ────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

function Section({
  icon, title, children, index, action,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode; index: number;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={sectionVariants}
      className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <span className="text-gray-400">{icon}</span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ─── Personal Info Form ─────────────────────────────────

interface PersonalFormData {
  display_name: string;
  phone: string;
  cpf: string;
  birth_date: string;
  gender: string;
}

function PersonalInfoSection({ profile, primaryColor, index }: {
  profile: any; primaryColor: string; index: number;
}) {
  const updateProfile = useUpdateCustomerProfile();
  const addToast = useToastStore((s) => s.addToast);

  const { register, handleSubmit, setValue, watch, formState: { isDirty } } = useForm<PersonalFormData>({
    defaultValues: {
      display_name: profile?.display_name || '',
      phone: profile?.phone || '',
      cpf: profile?.cpf || '',
      birth_date: profile?.birth_date || '',
      gender: profile?.gender || '',
    },
  });

  const phone = watch('phone');
  const cpf = watch('cpf');

  const onSubmit = async (data: PersonalFormData) => {
    try {
      await updateProfile.mutateAsync({
        display_name: data.display_name,
        phone: data.phone.replace(/\D/g, ''),
        cpf: data.cpf.replace(/\D/g, ''),
        birth_date: data.birth_date || null,
        gender: data.gender || null,
      });
      addToast('Perfil atualizado com sucesso!', 'success');
    } catch {
      addToast('Erro ao atualizar perfil.', 'error');
    }
  };

  return (
    <Section icon={<User size={18} />} title="Dados Pessoais" index={index}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome completo</label>
            <input
              {...register('display_name', { required: true })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow"
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefone</label>
            <input
              {...register('phone')}
              value={phone ? maskPhone(phone) : ''}
              onChange={e => setValue('phone', e.target.value, { shouldDirty: true })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow"
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">CPF</label>
            <input
              {...register('cpf')}
              value={cpf ? maskCpf(cpf) : ''}
              onChange={e => setValue('cpf', e.target.value, { shouldDirty: true })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow"
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data de nascimento</label>
            <input
              type="date"
              {...register('birth_date')}
              max="2026-12-31"
              min="1900-01-01"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Gênero</label>
          <select
            {...register('gender')}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow bg-white"
            style={{ '--tw-ring-color': primaryColor } as any}
          >
            <option value="">Prefiro não informar</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-end pt-1"
            >
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                {updateProfile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Salvar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Section>
  );
}

// ─── Address Modal ──────────────────────────────────────

interface AddressFormData {
  label: string;
  recipient_name: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
}

function AddressModal({
  address, onClose, primaryColor,
}: {
  address?: CustomerAddress; onClose: () => void; primaryColor: string;
}) {
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const addToast = useToastStore((s) => s.addToast);
  const [loadingCep, setLoadingCep] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AddressFormData>({
    defaultValues: address
      ? {
          label: address.label,
          recipient_name: address.recipient_name || '',
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement || '',
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          is_default: address.is_default,
        }
      : { label: 'Casa', is_default: false, cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', recipient_name: '' },
  });

  const cepValue = watch('cep');

  const handleCepBlur = useCallback(async () => {
    const clean = (cepValue || '').replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoadingCep(true);
    const result = await fetchAddressByCep(clean);
    setLoadingCep(false);
    if (result) {
      setValue('street', result.street, { shouldDirty: true });
      setValue('neighborhood', result.neighborhood, { shouldDirty: true });
      setValue('city', result.city, { shouldDirty: true });
      setValue('state', result.state, { shouldDirty: true });
    }
  }, [cepValue, setValue]);

  const onSubmit = async (data: AddressFormData) => {
    try {
      const payload = { ...data, cep: data.cep.replace(/\D/g, '') };
      if (address) {
        await updateAddress.mutateAsync({ id: address.id, updates: payload });
        addToast('Endereço atualizado!', 'success');
      } else {
        await createAddress.mutateAsync(payload);
        addToast('Endereço adicionado!', 'success');
      }
      onClose();
    } catch {
      addToast('Erro ao salvar endereço.', 'error');
    }
  };

  const isPending = createAddress.isPending || updateAddress.isPending;

  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <h3 className="font-bold text-gray-900">
            {address ? 'Editar Endereço' : 'Novo Endereço'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Label selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Tipo</label>
            <div className="flex gap-2">
              {['Casa', 'Trabalho', 'Outro'].map(opt => {
                const selected = watch('label') === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setValue('label', opt, { shouldDirty: true })}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all ${
                      selected ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    style={selected ? { backgroundColor: primaryColor } : {}}
                  >
                    {LABEL_ICONS[opt] || <MapPinned size={14} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nome do destinatário</label>
            <input
              {...register('recipient_name')}
              className={inputClass}
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="Quem irá receber"
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">CEP</label>
              <div className="relative">
                <input
                  {...register('cep', { required: 'CEP obrigatório' })}
                  value={cepValue ? maskCep(cepValue) : ''}
                  onChange={e => setValue('cep', e.target.value, { shouldDirty: true })}
                  onBlur={handleCepBlur}
                  className={inputClass}
                  style={{ '--tw-ring-color': primaryColor } as any}
                  placeholder="00000-000"
                />
                {loadingCep && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
              {errors.cep && <p className="text-xs text-red-500 mt-1">{errors.cep.message}</p>}
            </div>
            <div className="flex items-end">
              <a
                href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <Search size={14} /> Buscar
              </a>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Rua</label>
              <input
                {...register('street', { required: 'Rua obrigatória' })}
                className={inputClass}
                style={{ '--tw-ring-color': primaryColor } as any}
                placeholder="Rua, Avenida..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Número</label>
              <input
                {...register('number', { required: 'Nº' })}
                className={inputClass}
                style={{ '--tw-ring-color': primaryColor } as any}
                placeholder="Nº"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Complemento</label>
              <input
                {...register('complement')}
                className={inputClass}
                style={{ '--tw-ring-color': primaryColor } as any}
                placeholder="Apto, Bloco..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Bairro</label>
              <input
                {...register('neighborhood', { required: 'Bairro obrigatório' })}
                className={inputClass}
                style={{ '--tw-ring-color': primaryColor } as any}
                placeholder="Bairro"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Cidade</label>
              <input
                {...register('city', { required: 'Cidade obrigatória' })}
                className={inputClass}
                style={{ '--tw-ring-color': primaryColor } as any}
                placeholder="Cidade"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">UF</label>
              <select
                {...register('state', { required: 'UF' })}
                className={`${inputClass} bg-white`}
                style={{ '--tw-ring-color': primaryColor } as any}
              >
                <option value="">UF</option>
                {BR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" {...register('is_default')} className="rounded border-gray-300" />
            <span className="text-sm text-gray-600">Usar como endereço padrão</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {address ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Address Card ───────────────────────────────────────

function AddressCard({
  address, primaryColor, onEdit, onDelete,
}: {
  address: CustomerAddress; primaryColor: string;
  onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="group relative border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400">
            {LABEL_ICONS[address.label] || <MapPinned size={14} />}
          </span>
          <span className="text-sm font-semibold text-gray-800">{address.label}</span>
          {address.is_default && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Padrão
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Editar">
            <Pencil size={14} className="text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Excluir">
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>
      {address.recipient_name && (
        <p className="text-sm text-gray-600 mb-0.5">{address.recipient_name}</p>
      )}
      <p className="text-sm text-gray-500 leading-relaxed">
        {address.street}, {address.number}
        {address.complement ? ` - ${address.complement}` : ''}
        <br />
        {address.neighborhood} — {address.city}/{address.state}
        <br />
        CEP {maskCep(address.cep)}
      </p>
    </div>
  );
}

// ─── Addresses Section ──────────────────────────────────

function AddressesSection({ primaryColor, index }: { primaryColor: string; index: number }) {
  const { data: addresses, isLoading } = useAddresses();
  const deleteAddress = useDeleteAddress();
  const addToast = useToastStore((s) => s.addToast);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | undefined>();
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este endereço?')) return;
    try {
      await deleteAddress.mutateAsync(id);
      addToast('Endereço removido.', 'info');
    } catch {
      addToast('Erro ao remover endereço.', 'error');
    }
  };

  return (
    <Section
      icon={<MapPin size={18} />}
      title="Endereços"
      index={index}
      action={
        <button
          onClick={() => { setEditingAddress(undefined); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          style={{ color: primaryColor, backgroundColor: `${primaryColor}10` }}
        >
          <Plus size={14} /> Adicionar
        </button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : !addresses || addresses.length === 0 ? (
        <div className="text-center py-8">
          <MapPin size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Nenhum endereço cadastrado.</p>
          <button
            onClick={() => { setEditingAddress(undefined); setShowModal(true); }}
            className="mt-3 text-sm font-semibold transition-colors"
            style={{ color: primaryColor }}
          >
            Adicionar primeiro endereço
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {addresses.map(addr => (
            <AddressCard
              key={addr.id}
              address={addr}
              primaryColor={primaryColor}
              onEdit={() => { setEditingAddress(addr); setShowModal(true); }}
              onDelete={() => handleDelete(addr.id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <AddressModal
            address={editingAddress}
            primaryColor={primaryColor}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </Section>
  );
}

// ─── Main Page ──────────────────────────────────────────

export function ProfilePage() {
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const { primaryColor } = useBrandColors();
  const { data: profile, isLoading } = useCustomerProfile();

  if (isLoading || authLoading || !user || !authProfile) return <ProfileSkeleton />;

  return (
    <AccountLayout title="Meu Perfil" subtitle="Gerencie seus dados pessoais e endereços" icon={User}>
      <div className="space-y-5">
        <PersonalInfoSection profile={profile} primaryColor={primaryColor} index={0} />
        <AddressesSection primaryColor={primaryColor} index={1} />
      </div>
    </AccountLayout>
  );
}
