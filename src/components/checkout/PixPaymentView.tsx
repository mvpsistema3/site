import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { usePixPolling } from '../../hooks/usePixPolling';
import { useToastStore } from '../../stores/toastStore';
import { useBrandColors } from '../../hooks/useTheme';

interface PixPaymentViewProps {
  orderId: string;
  orderNumber: string;
  qrCode: string;
  payload: string;
  expiration: string;
  invoiceUrl: string;
  onPaymentConfirmed: () => void;
}

export function PixPaymentView({
  orderId,
  orderNumber,
  qrCode,
  payload,
  expiration,
  invoiceUrl,
  onPaymentConfirmed,
}: PixPaymentViewProps) {
  const { primaryColor } = useBrandColors();
  const addToast = useToastStore((s) => s.addToast);
  const [copied, setCopied] = useState(false);

  const { status, timeRemaining } = usePixPolling({
    orderId,
    enabled: true,
    onPaymentConfirmed,
    expirationDate: expiration,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      addToast('Código PIX copiado!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      addToast('Erro ao copiar. Selecione e copie manualmente.', 'error');
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getTimerColor = (seconds: number) => {
    if (seconds < 120) return '#ef4444';
    if (seconds < 300) return '#f97316';
    return primaryColor;
  };

  if (status === 'confirmed') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <Check size={36} style={{ color: primaryColor }} strokeWidth={2.5} />
        </motion.div>
        <h2 className="text-xl font-bold uppercase tracking-wide mb-2">Pagamento confirmado!</h2>
        <p className="text-gray-500 text-sm">Redirecionando...</p>
      </motion.div>
    );
  }

  if (status === 'expired') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <Clock size={36} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wide mb-2">PIX expirado</h2>
        <p className="text-gray-500 text-sm mb-6">
          O tempo para pagamento expirou. Por favor, tente novamente.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="max-w-md mx-auto text-center py-8"
    >
      <h2 className="text-xl font-bold uppercase tracking-wide mb-1">Pedido {orderNumber}</h2>
      <p className="text-sm text-gray-500 mb-8">
        Escaneie o QR Code ou copie o código PIX
      </p>

      {/* QR Code */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="inline-block p-5 rounded-2xl border-2 border-gray-100 shadow-lg bg-white mb-8"
      >
        <img
          src={`data:image/png;base64,${qrCode}`}
          alt="QR Code PIX"
          className="w-56 h-56"
        />
      </motion.div>

      {/* Copy button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleCopy}
        className="w-full max-w-sm mx-auto py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all duration-200"
        style={
          copied
            ? { backgroundColor: '#16a34a', color: 'white' }
            : { backgroundColor: primaryColor, color: 'white' }
        }
      >
        {copied ? (
          <>
            <Check size={16} />
            Copiado!
          </>
        ) : (
          <>
            <Copy size={16} />
            Copiar código PIX
          </>
        )}
      </motion.button>

      {/* PIX code (selectable) */}
      <div className="mt-4 p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-100">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1.5">Código PIX Copia e Cola</p>
        <p className="text-xs text-gray-500 break-all font-mono select-all leading-relaxed">
          {payload.length > 100 ? `${payload.substring(0, 100)}...` : payload}
        </p>
      </div>

      {/* Timer */}
      {timeRemaining !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border"
          style={{
            borderColor: `${getTimerColor(timeRemaining)}25`,
            backgroundColor: `${getTimerColor(timeRemaining)}08`,
          }}
        >
          <Clock size={16} style={{ color: getTimerColor(timeRemaining) }} />
          <span
            className="text-sm font-mono font-bold"
            style={{ color: getTimerColor(timeRemaining) }}
          >
            {formatTime(timeRemaining)}
          </span>
        </motion.div>
      )}

      {/* Waiting indicator */}
      <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Loader2 size={16} className="animate-spin" />
        </motion.div>
        <span className="text-sm">Aguardando pagamento...</span>
      </div>

      {/* Invoice link */}
      <a
        href={invoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ExternalLink size={12} />
        Abrir fatura completa
      </a>
    </motion.div>
  );
}
