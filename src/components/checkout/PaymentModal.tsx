import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Clock, ExternalLink, Loader2,
  Package, ShoppingBag, ShieldCheck, CheckCircle, X,
} from 'lucide-react';
import { usePixPolling } from '../../hooks/usePixPolling';
import { useToastStore } from '../../stores/toastStore';
import { useBrandColors } from '../../hooks/useTheme';
import type { CheckoutResult } from '../../types/checkout.types';

type ModalPhase = 'pix_waiting' | 'pix_expired' | 'card_processing' | 'success';

interface PaymentModalProps {
  result: CheckoutResult | null;
  onPaymentConfirmed: () => void;
  onNavigateToOrder: () => void;
  onContinueShopping: () => void;
}

export function PaymentModal({
  result,
  onPaymentConfirmed,
  onNavigateToOrder,
  onContinueShopping,
}: PaymentModalProps) {
  const { primaryColor } = useBrandColors();
  const addToast = useToastStore((s) => s.addToast);
  const [phase, setPhase] = useState<ModalPhase>('pix_waiting');
  const [copied, setCopied] = useState(false);

  // Derive initial phase from result
  useEffect(() => {
    if (!result) return;
    if (result.type === 'pix') setPhase('pix_waiting');
    else if (result.type === 'card_confirmed') {
      setPhase('success');
      onPaymentConfirmed();
    } else if (result.type === 'card_pending') {
      setPhase('card_processing');
    }
  }, [result?.type]);

  // PIX polling
  const pixResult = result?.type === 'pix' ? result : null;

  const handlePixConfirmed = useCallback(() => {
    setPhase('success');
    onPaymentConfirmed();
    addToast('Pagamento PIX confirmado!', 'success');
  }, [onPaymentConfirmed, addToast]);

  const handlePixExpired = useCallback(() => {
    setPhase('pix_expired');
  }, []);

  const { timeRemaining } = usePixPolling({
    orderId: pixResult?.orderId || '',
    enabled: !!pixResult && phase === 'pix_waiting',
    onPaymentConfirmed: handlePixConfirmed,
    onExpired: handlePixExpired,
    expirationDate: pixResult?.pix?.expiration,
  });

  // Body scroll lock
  useEffect(() => {
    if (result) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [result]);

  // Copy PIX code
  const handleCopy = async () => {
    if (!pixResult?.pix) return;
    try {
      await navigator.clipboard.writeText(pixResult.pix.payload);
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

  if (!result) return null;

  const orderNumber = result.orderNumber;
  const isCloseable = phase === 'success' || phase === 'pix_expired';

  return (
    <AnimatePresence>
      <motion.div
        key="payment-modal-backdrop"
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isCloseable ? onContinueShopping : undefined}
      />
      <motion.div
        key="payment-modal-content"
        className="fixed inset-0 flex items-center justify-center p-4 z-[61]"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button — only when closeable */}
          {isCloseable && (
            <button
              onClick={phase === 'pix_expired' ? onContinueShopping : undefined}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors z-10"
            >
              <X size={16} />
            </button>
          )}

          {/* Guarda defensiva: só renderiza PIX se pix não for null */}
          {phase === 'pix_waiting' && pixResult?.pix && (
            <PixWaitingContent
              orderNumber={orderNumber}
              qrCode={pixResult!.pix.qr_code}
              payload={pixResult!.pix.payload}
              invoiceUrl={pixResult!.invoiceUrl}
              timeRemaining={timeRemaining}
              copied={copied}
              onCopy={handleCopy}
              primaryColor={primaryColor}
              formatTime={formatTime}
              getTimerColor={getTimerColor}
            />
          )}

          {phase === 'pix_expired' && (
            <PixExpiredContent
              onClose={onContinueShopping}
              primaryColor={primaryColor}
            />
          )}

          {phase === 'card_processing' && (
            <CardProcessingContent
              orderNumber={orderNumber}
              primaryColor={primaryColor}
              onNavigateToOrder={onNavigateToOrder}
            />
          )}

          {phase === 'success' && (
            <SuccessContent
              orderNumber={orderNumber}
              primaryColor={primaryColor}
              onNavigateToOrder={onNavigateToOrder}
              onContinueShopping={onContinueShopping}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── PIX Waiting ──────────────────────────────────────────

function PixWaitingContent({
  orderNumber, qrCode, payload, invoiceUrl,
  timeRemaining, copied, onCopy, primaryColor, formatTime, getTimerColor,
}: {
  orderNumber: string;
  qrCode: string;
  payload: string;
  invoiceUrl: string;
  timeRemaining: number | null;
  copied: boolean;
  onCopy: () => Promise<void>;
  primaryColor: string;
  formatTime: (s: number) => string;
  getTimerColor: (s: number) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-6 text-center"
    >
      <h2 className="text-lg font-bold uppercase tracking-wide mb-0.5">Pedido {orderNumber}</h2>
      <p className="text-sm text-gray-500 mb-6">Escaneie o QR Code ou copie o código PIX</p>

      {/* QR Code */}
      <div className="inline-block p-4 rounded-2xl border-2 border-gray-100 shadow-lg bg-white mb-6">
        <img
          src={`data:image/png;base64,${qrCode}`}
          alt="QR Code PIX"
          className="w-48 h-48 sm:w-56 sm:h-56"
        />
      </div>

      {/* Copy button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onCopy}
        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all duration-200 text-white"
        style={{ backgroundColor: copied ? '#16a34a' : primaryColor }}
      >
        {copied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar código PIX</>}
      </motion.button>

      {/* PIX code */}
      <div className="mt-4 p-3 bg-gray-50/80 rounded-xl border border-gray-100">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Código PIX Copia e Cola</p>
        <p className="text-xs text-gray-500 break-all font-mono select-all leading-relaxed">
          {payload.length > 80 ? `${payload.substring(0, 80)}...` : payload}
        </p>
      </div>

      {/* Timer */}
      {timeRemaining !== null && (
        <div
          className="mt-6 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border"
          style={{
            borderColor: `${getTimerColor(timeRemaining)}25`,
            backgroundColor: `${getTimerColor(timeRemaining)}08`,
          }}
        >
          <Clock size={16} style={{ color: getTimerColor(timeRemaining) }} />
          <span className="text-sm font-mono font-bold" style={{ color: getTimerColor(timeRemaining) }}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      )}

      {/* Waiting indicator */}
      <div className="mt-5 flex items-center justify-center gap-2 text-gray-400">
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
        className="mt-3 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <ExternalLink size={12} />
        Abrir fatura completa
      </a>
    </motion.div>
  );
}

// ─── PIX Expired ──────────────────────────────────────────

function PixExpiredContent({
  onClose, primaryColor,
}: {
  onClose: () => void;
  primaryColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-8 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
        <Clock size={36} className="text-red-500" />
      </div>
      <h2 className="text-xl font-bold uppercase tracking-wide mb-2">PIX expirado</h2>
      <p className="text-gray-500 text-sm mb-8">
        O tempo para pagamento expirou. Por favor, tente novamente.
      </p>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClose}
        className="w-full py-3.5 rounded-xl border-2 font-bold text-sm uppercase tracking-wide hover:bg-gray-50 transition-colors"
        style={{ borderColor: primaryColor, color: primaryColor }}
      >
        Voltar ao checkout
      </motion.button>
    </motion.div>
  );
}

// ─── Card Processing ──────────────────────────────────────

function CardProcessingContent({
  orderNumber, primaryColor, onNavigateToOrder,
}: {
  orderNumber: string;
  primaryColor: string;
  onNavigateToOrder: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-8 text-center"
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: `${primaryColor}12` }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Clock size={32} style={{ color: primaryColor }} />
        </motion.div>
      </div>
      <h2 className="text-xl font-bold uppercase tracking-wide mb-2">Processando pagamento</h2>
      <p className="text-gray-500 text-sm mb-8">
        Pedido <span className="font-semibold" style={{ color: primaryColor }}>{orderNumber}</span> — Aguardando confirmação.
      </p>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onNavigateToOrder}
        className="w-full py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: primaryColor }}
      >
        <Package size={16} />
        Ver meus pedidos
      </motion.button>
    </motion.div>
  );
}

// ─── Success ──────────────────────────────────────────────

function SuccessContent({
  orderNumber, primaryColor, onNavigateToOrder, onContinueShopping,
}: {
  orderNumber: string;
  primaryColor: string;
  onNavigateToOrder: () => void;
  onContinueShopping: () => void;
}) {
  // Celebration dots
  const dots = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 50;
    return (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{ backgroundColor: i % 2 === 0 ? primaryColor : `${primaryColor}80`, left: '50%', top: '50%' }}
        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
        animate={{
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          scale: [0, 1.5, 0],
          opacity: [1, 1, 0],
        }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
      />
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-8 text-center"
    >
      {/* Checkmark with celebration */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        {dots}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: `${primaryColor}08`, border: `2px solid ${primaryColor}20` }}
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <CheckCircle size={40} style={{ color: primaryColor }} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold uppercase tracking-wide mb-2">Pedido confirmado!</h2>
        <p className="text-lg font-bold mb-1" style={{ color: primaryColor }}>
          {orderNumber}
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Seu pagamento foi aprovado com sucesso.
        </p>
      </motion.div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="space-y-3"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onNavigateToOrder}
          className="w-full py-3.5 rounded-xl text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          <Package size={16} />
          Ver meu pedido
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onContinueShopping}
          className="w-full py-3.5 rounded-xl border-2 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          <ShoppingBag size={16} />
          Continuar comprando
        </motion.button>
      </motion.div>

      {/* Trust seal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 flex items-center justify-center gap-1.5 text-gray-400"
      >
        <ShieldCheck size={14} />
        <span className="text-[10px] uppercase tracking-widest font-bold">Compra segura e protegida</span>
      </motion.div>
    </motion.div>
  );
}
