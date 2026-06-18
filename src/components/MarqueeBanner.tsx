import React, { useLayoutEffect, useRef, useState } from 'react';
import { Leaf, Truck, CreditCard, Star, Sparkles } from 'lucide-react';

export interface MarqueeItem {
  text: string;
  icon?: 'leaf' | 'truck' | 'credit-card' | 'star' | 'sparkles';
}

interface MarqueeBannerProps {
  items: MarqueeItem[];
  bgColor?: string;
  textColor?: string;
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
}

const iconMap = {
  leaf: Leaf,
  truck: Truck,
  'credit-card': CreditCard,
  star: Star,
  sparkles: Sparkles,
};

/**
 * Banner com texto scrolling infinito (estilo aLeda)
 *
 * Loop sem emenda: renderiza N cópias dos itens (o suficiente para sempre
 * cobrir a tela com folga) e a animação anda exatamente 1 cópia por ciclo
 * (translateX -100%/N). Como cada ciclo dura o mesmo tempo independente de N,
 * a velocidade percebida não muda — só elimina o vão/engasgo quando os itens
 * são mais estreitos que a largura da tela (caso comum no mobile).
 */
export function MarqueeBanner({
  items,
  bgColor = '#B91C1C',
  textColor = '#FFFFFF',
  speed = 'normal',
  className = '',
}: MarqueeBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  // Mínimo de 2 cópias mantém o comportamento atual enquanto ainda não medimos.
  const [copies, setCopies] = useState(2);

  const speedClass = {
    slow: 'animate-marquee',
    normal: 'animate-marquee',
    fast: 'animate-marquee',
  }[speed];

  // Mede a largura de 1 cópia vs. a tela e repete o suficiente para cobrir a
  // viewport + 1 cópia de folga (sempre tem conteúdo entrando pela direita).
  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const copy = copyRef.current;
      if (!container || !copy) return;
      const containerWidth = container.offsetWidth;
      const copyWidth = copy.offsetWidth;
      if (copyWidth === 0) return;
      const needed = Math.ceil(containerWidth / copyWidth) + 1;
      setCopies(Math.max(2, needed));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden py-3 ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div
        className={`flex w-max ${speedClass}`}
        style={{ ['--marquee-copies' as string]: copies }}
      >
        {Array.from({ length: copies }).map((_, copyIndex) => (
          <div
            key={copyIndex}
            ref={copyIndex === 0 ? copyRef : undefined}
            className="flex whitespace-nowrap"
            aria-hidden={copyIndex > 0 ? true : undefined}
          >
            {items.map((item, index) => {
              const IconComponent = item.icon ? iconMap[item.icon] : null;

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 px-6 md:px-8"
                  style={{ color: textColor }}
                >
                  {IconComponent && (
                    <IconComponent className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  )}
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider">
                    {item.text}
                  </span>
                  <span className="mx-4 text-lg opacity-50">|</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
