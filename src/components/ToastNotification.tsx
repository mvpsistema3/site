import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, ToastType } from '../stores/toastStore';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-blue-500" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
};

export const ToastNotification: React.FC = () => {
  const { toasts, removeToast, flushPendingToasts } = useToastStore();

  useEffect(() => {
    flushPendingToasts();
  }, [flushPendingToasts]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm max-w-sm ${bgColors[toast.type]}`}
          >
            {icons[toast.type]}
            <span className="text-sm font-medium text-gray-800 flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
