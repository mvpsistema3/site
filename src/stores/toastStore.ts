import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const PENDING_TOAST_KEY = 'pending_toast';

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  /** Salva um toast no localStorage para exibir após reload */
  queueToast: (message: string, type?: ToastType) => void;
  /** Verifica e exibe toasts pendentes do localStorage */
  flushPendingToasts: () => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  queueToast: (message, type = 'info') => {
    localStorage.setItem(PENDING_TOAST_KEY, JSON.stringify({ message, type }));
  },
  flushPendingToasts: () => {
    const raw = localStorage.getItem(PENDING_TOAST_KEY);
    if (raw) {
      localStorage.removeItem(PENDING_TOAST_KEY);
      try {
        const { message, type } = JSON.parse(raw);
        get().addToast(message, type);
      } catch {
        // ignore
      }
    }
  },
}));
