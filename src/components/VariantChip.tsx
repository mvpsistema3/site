import type { CSSProperties } from 'react';
import { cn } from '../lib/utils';

interface VariantChipProps {
  /** Texto da opção (cor ou tamanho). */
  label: string;
  /** Cor CSS (hex/gradiente) quando a dimensão é do tipo "color". */
  swatch?: string;
  /** true = bolinha de cor; false = pílula de texto (tamanho/etc). */
  isColor: boolean;
  selected: boolean;
  outOfStock: boolean;
  /** Cor primária da marca (destaque do selecionado). */
  primaryColor: string;
  onSelect: () => void;
}

/**
 * Opção de variante na PDP.
 *
 * Regra de UX (definida com o cliente): a opção esgotada CONTINUA clicável —
 * ao selecioná-la, o botão de ação passa a exibir "ESGOTADO". A opção apenas
 * fica visualmente marcada (riscada/esmaecida), nunca bloqueada para clique.
 */
export function VariantChip({
  label,
  swatch,
  isColor,
  selected,
  outOfStock,
  primaryColor,
  onSelect,
}: VariantChipProps) {
  const title = `${label}${outOfStock ? ' (Esgotado)' : ''}`;

  if (isColor) {
    return (
      <button
        type="button"
        onClick={onSelect}
        title={title}
        aria-pressed={selected}
        className={cn(
          'relative h-8 w-8 flex-shrink-0 rounded-full transition-all duration-200',
          selected
            ? 'scale-110 shadow-sm ring-2 ring-offset-2'
            : 'ring-1 ring-gray-200 hover:scale-105 hover:ring-gray-400',
          outOfStock && !selected && 'opacity-40',
        )}
        style={{
          background: swatch || label,
          ...(selected ? ({ '--tw-ring-color': primaryColor } as CSSProperties) : {}),
        }}
      >
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
            <span className="absolute h-px w-[130%] rotate-45 bg-red-400" />
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      title={title}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-10 min-w-[42px] items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all duration-200',
        selected
          ? 'border-transparent text-white shadow-sm'
          : 'border-gray-200 bg-white text-gray-800 hover:border-gray-800',
        outOfStock && 'line-through',
        outOfStock && !selected && 'text-gray-400',
      )}
      style={
        selected
          ? { backgroundColor: outOfStock ? '#9ca3af' : primaryColor, borderColor: outOfStock ? '#9ca3af' : primaryColor }
          : undefined
      }
    >
      {label}
    </button>
  );
}
