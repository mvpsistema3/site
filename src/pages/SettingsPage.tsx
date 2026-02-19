import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Lock, Bell, Trash2, Check, Loader2, Eye, EyeOff,
  AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBrandColors } from '../hooks/useTheme';
import { useCustomerProfile, useUpdateCustomerProfile } from '../hooks/useCustomerProfile';
import { useToastStore } from '../stores/toastStore';
import { getBrandUrlPrefix } from '../lib/brand-detection';
import { AccountLayout } from '../components/AccountLayout';

// ─── Section wrapper ────────────────────────────────────

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

function Section({
  icon, title, children, index,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode; index: number;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={sectionVariants}
      className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ─── Change Password ────────────────────────────────────

interface PasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

function ChangePasswordSection({ primaryColor, index }: { primaryColor: string; index: number }) {
  const addToast = useToastStore((s) => s.addToast);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<PasswordFormData>();

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }
    if (data.newPassword.length < 6) {
      addToast('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    setIsPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw error;
      addToast('Senha alterada com sucesso!', 'success');
      reset();
    } catch (err: any) {
      addToast(err?.message || 'Erro ao alterar senha.', 'error');
    } finally {
      setIsPending(false);
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-shadow pr-10";

  return (
    <Section icon={<Lock size={18} />} title="Alterar Senha" index={index}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Nova senha</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              {...register('newPassword', {
                required: 'Nova senha obrigatória',
                minLength: { value: 6, message: 'Mínimo 6 caracteres' },
              })}
              className={inputClass}
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirmar nova senha</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              {...register('confirmPassword', {
                required: 'Confirme a senha',
                validate: (val) => val === watch('newPassword') || 'As senhas não coincidem',
              })}
              className={inputClass}
              style={{ '--tw-ring-color': primaryColor } as any}
              placeholder="Repita a nova senha"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Alterar Senha
          </button>
        </div>
      </form>
    </Section>
  );
}

// ─── Notification Preferences ───────────────────────────

function NotificationsSection({ primaryColor, index }: { primaryColor: string; index: number }) {
  const { data: profile } = useCustomerProfile();
  const updateProfile = useUpdateCustomerProfile();
  const addToast = useToastStore((s) => s.addToast);

  const prefs = profile?.notification_preferences || {
    email_marketing: true,
    promotions: true,
    order_updates: true,
  };

  const togglePref = async (key: keyof typeof prefs) => {
    try {
      await updateProfile.mutateAsync({
        notification_preferences: {
          ...prefs,
          [key]: !prefs[key],
        },
      });
    } catch {
      addToast('Erro ao atualizar preferências.', 'error');
    }
  };

  const toggleItems = [
    { key: 'order_updates' as const, label: 'Atualizações de pedidos', desc: 'Notificações sobre status de envio e entrega' },
    { key: 'promotions' as const, label: 'Promoções e ofertas', desc: 'Descontos exclusivos e ofertas especiais' },
    { key: 'email_marketing' as const, label: 'Newsletter', desc: 'Novidades, lançamentos e conteúdo da marca' },
  ];

  return (
    <Section icon={<Bell size={18} />} title="Notificações" index={index}>
      <div className="space-y-1">
        {toggleItems.map(({ key, label, desc }) => (
          <label
            key={key}
            className="flex items-center justify-between py-3 cursor-pointer group"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => togglePref(key)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                prefs[key] ? '' : 'bg-gray-200'
              }`}
              style={prefs[key] ? { backgroundColor: primaryColor } : {}}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  prefs[key] ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </Section>
  );
}

// ─── Delete Account ─────────────────────────────────────

function DeleteAccountSection({ index }: { index: number }) {
  const addToast = useToastStore((s) => s.addToast);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'EXCLUIR') {
      addToast('Digite EXCLUIR para confirmar.', 'error');
      return;
    }
    setIsPending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ confirmation: 'EXCLUIR' }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao excluir conta');
      }

      // User is already deleted on server — force clear local session only
      // (server-side signOut would fail since user no longer exists)
      await supabase.auth.signOut({ scope: 'local' });
      addToast('Sua conta foi excluída permanentemente.', 'info');
      const brandPrefix = getBrandUrlPrefix();
      window.location.hash = '#' + brandPrefix + '/';
      // Force reload to reset all React state and caches
      window.location.reload();
    } catch (err: any) {
      addToast(err?.message || 'Erro ao processar solicitação.', 'error');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={sectionVariants}
      className="bg-white rounded-xl border border-red-100 overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-50">
        <span className="text-red-400"><Trash2 size={18} /></span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">Excluir Conta</h2>
      </div>
      <div className="p-5">
        {!showConfirm ? (
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600 mb-3">
                A exclusão da conta é permanente. Todos os seus dados, pedidos e favoritos serão removidos.
              </p>
              <button
                onClick={() => setShowConfirm(true)}
                className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Quero excluir minha conta
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Esta ação não pode ser desfeita. Digite <strong>EXCLUIR</strong> para confirmar.
              </p>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1"
              placeholder='Digite "EXCLUIR"'
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'EXCLUIR' || isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold bg-red-600 transition-opacity disabled:opacity-40"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────

export function SettingsPage() {
  const { primaryColor } = useBrandColors();

  return (
    <AccountLayout title="Configurações" subtitle="Segurança, notificações e conta" icon={Settings}>
      <div className="space-y-5">
        <ChangePasswordSection primaryColor={primaryColor} index={0} />
        <NotificationsSection primaryColor={primaryColor} index={1} />
        <DeleteAccountSection index={2} />
      </div>
    </AccountLayout>
  );
}
