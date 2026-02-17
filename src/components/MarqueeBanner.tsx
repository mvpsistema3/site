import React from 'react';
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
 * Duplica os items para criar efeito de loop contínuo
 */
export function MarqueeBanner({
  items,
  bgColor = '#B91C1C',
  textColor = '#FFFFFF',
  speed = 'normal',
  className = '',
}: MarqueeBannerProps) {
  // Duplicar items para efeito de loop contínuo
  const duplicatedItems = [...items, ...items];

  const speedClass = {
    slow: 'animate-marquee',
    normal: 'animate-marquee',
    fast: 'animate-marquee',
  }[speed];

  // Ajustar duração via inline style
  const animationDuration = {
    slow: '40s',
    normal: '30s',
    fast: '20s',
  }[speed];

  return (
    <div
      className={`overflow-hidden py-3 ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div
        className={`flex whitespace-nowrap ${speedClass}`}
        style={{ animationDuration }}
      >
        {duplicatedItems.map((item, index) => {
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
    </div>
  );
}
