/**
 * PIX payment polling — Supabase Realtime + HTTP fallback.
 * Monitors order payment_status changes for PIX confirmation.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface UsePixPollingOptions {
  orderId: string;
  enabled: boolean;
  onPaymentConfirmed: () => void;
  onExpired?: () => void;
  expirationDate?: string;
}

interface UsePixPollingReturn {
  status: 'waiting' | 'confirmed' | 'expired' | 'error';
  timeRemaining: number | null;
}

export function usePixPolling({
  orderId,
  enabled,
  onPaymentConfirmed,
  onExpired,
  expirationDate,
}: UsePixPollingOptions): UsePixPollingReturn {
  const [status, setStatus] = useState<UsePixPollingReturn['status']>('waiting');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const confirmedRef = useRef(false);

  const handleConfirmed = useCallback(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    setStatus('confirmed');
    onPaymentConfirmed();
  }, [onPaymentConfirmed]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!enabled || !orderId || status !== 'waiting') return;

    const channel = supabase
      .channel(`order-pix-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const ps = payload.new?.payment_status;
          if (ps === 'confirmed' || ps === 'received') {
            handleConfirmed();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, enabled, status, handleConfirmed]);

  // Hard cap: stop all polling after 30 minutes even without expirationDate
  useEffect(() => {
    if (!enabled || status !== 'waiting') return;

    const timeout = setTimeout(() => {
      if (!confirmedRef.current) {
        setStatus('expired');
        onExpired?.();
      }
    }, 30 * 60 * 1000);

    return () => clearTimeout(timeout);
  }, [enabled, status, onExpired]);

  // Fallback HTTP poll every 10 seconds
  useEffect(() => {
    if (!enabled || !orderId || status !== 'waiting') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('payment_status')
          .eq('id', orderId)
          .single();

        if (data && (data.payment_status === 'confirmed' || data.payment_status === 'received')) {
          handleConfirmed();
        }
      } catch {
        // Silent fail — Realtime is the primary channel
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [orderId, enabled, status, handleConfirmed]);

  // Expiration countdown timer
  useEffect(() => {
    if (!expirationDate || status !== 'waiting') return;

    const tick = () => {
      const remaining = Math.floor(
        (new Date(expirationDate).getTime() - Date.now()) / 1000
      );
      if (remaining <= 0) {
        setStatus('expired');
        setTimeRemaining(0);
        onExpired?.();
        return false;
      }
      setTimeRemaining(remaining);
      return true;
    };

    // Initial tick
    if (!tick()) return;

    const interval = setInterval(() => {
      if (!tick()) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationDate, status, onExpired]);

  return { status, timeRemaining };
}
