import { motion } from 'framer-motion';
import { User, MapPin, CreditCard, ClipboardCheck, Check } from 'lucide-react';
import { useBrandColors } from '../../hooks/useTheme';
import type { CheckoutStep } from '../../types/checkout.types';

const STEPS: Array<{ key: CheckoutStep; label: string; icon: typeof User }> = [
  { key: 'identification', label: 'Dados', icon: User },
  { key: 'delivery', label: 'Entrega', icon: MapPin },
  { key: 'payment', label: 'Pagamento', icon: CreditCard },
  { key: 'review', label: 'Revisão', icon: ClipboardCheck },
];

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
  onStepClick: (step: CheckoutStep) => void;
  canNavigate: (step: CheckoutStep) => boolean;
}

export function CheckoutStepper({
  currentStep,
  completedSteps,
  onStepClick,
  canNavigate,
}: CheckoutStepperProps) {
  const { primaryColor } = useBrandColors();

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between w-full max-w-lg mx-auto">
        {STEPS.map((step, index) => {
          const isCurrent = currentStep === step.key;
          const isCompleted = completedSteps.includes(step.key);
          const isClickable = canNavigate(step.key);
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={`relative flex flex-col items-center gap-1.5 ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <motion.div
                  className="flex items-center justify-center w-11 h-11 rounded-full border-2"
                  style={
                    isCurrent
                      ? {
                          borderColor: primaryColor,
                          backgroundColor: 'transparent',
                          boxShadow: `0 0 0 4px ${primaryColor}15`,
                        }
                      : isCompleted
                        ? { borderColor: primaryColor, backgroundColor: primaryColor }
                        : { borderColor: '#e5e7eb', backgroundColor: 'transparent' }
                  }
                  animate={isCurrent ? { scale: [1, 1.06, 1] } : {}}
                  transition={
                    isCurrent
                      ? { duration: 2.5, repeat: Infinity, ease: [0.25, 0.1, 0.25, 1] }
                      : {}
                  }
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    >
                      <Check size={18} className="text-white" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <Icon
                      size={18}
                      style={isCurrent ? { color: primaryColor } : { color: '#9ca3af' }}
                    />
                  )}
                </motion.div>
                <span
                  className="hidden sm:block text-[10px] uppercase tracking-widest font-bold"
                  style={isCurrent || isCompleted ? { color: primaryColor } : { color: '#9ca3af' }}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3 h-0.5 rounded-full bg-gray-200 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: primaryColor }}
                    initial={{ width: '0%' }}
                    animate={{
                      width: completedSteps.includes(step.key) ? '100%' : '0%',
                    }}
                    transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
