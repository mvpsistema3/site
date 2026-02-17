import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface OrderReservationTimerProps {
  orderId: string;
  createdAt: Date;
  expiryMinutes?: number;
  onExpired?: () => void;
}

export function OrderReservationTimer({
  orderId,
  createdAt,
  expiryMinutes = 15,
  onExpired
}: OrderReservationTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    const startTime = new Date(createdAt).getTime();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = expiryMinutes * 60 * 1000 - elapsed;

      if (remaining <= 0) {
        // Reserva expirou
        setTimeRemaining(0);
        clearInterval(interval);

        // Chamar callback de expiração
        if (onExpired) {
          onExpired();
        }
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, expiryMinutes, onExpired]);

  if (!timeRemaining) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const isUrgent = minutes < 5;
  const isCritical = minutes < 2;

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-3 rounded-lg font-medium
        ${isCritical
          ? 'bg-red-100 text-red-800 animate-pulse border border-red-300'
          : isUrgent
          ? 'bg-orange-100 text-orange-800 border border-orange-300'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
        }
      `}
    >
      {isCritical ? (
        <AlertTriangle className="w-5 h-5" />
      ) : (
        <Clock className="w-5 h-5" />
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold">
          {isCritical
            ? '⚠️ Urgente! Complete o pagamento'
            : isUrgent
            ? '⏰ Finalize logo seu pagamento'
            : '✅ Produto reservado para você'
          }
        </p>
        <p className="text-xs mt-1 opacity-90">
          Tempo restante: <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>
        </p>
      </div>
    </div>
  );
}