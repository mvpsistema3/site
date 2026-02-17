import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';

const PROMO_SEEN_KEY = 'promo_popup_seen_date';

interface Promo {
  id: string;
  title: string;
  description: string;
  image?: string;
  couponCode?: string;
  ctaText?: string;
  ctaLink?: string;
}

/**
 * Popup promocional
 * Aparece uma vez por dia se houver promoção ativa
 */
export function PromoPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [promo, setPromo] = useState<Promo | null>(null);
  const { brandConfig } = useBrand();

  useEffect(() => {
    // Verificar se já viu hoje
    const lastSeen = localStorage.getItem(PROMO_SEEN_KEY);
    const today = new Date().toDateString();

    if (lastSeen !== today) {
      // Aqui você pode buscar do Supabase
      // Por enquanto, vou usar uma promo mockada
      const mockPromo: Promo = {
        id: '1',
        title: '🎉 Promoção Especial!',
        description: 'Ganhe 15% de desconto em toda a loja',
        couponCode: 'PROMO15',
        ctaText: 'Aproveitar agora',
        ctaLink: '/shop',
      };

      // Pequeno delay para não aparecer junto com o popup +18
      const timer = setTimeout(() => {
        setPromo(mockPromo);
        setIsOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(PROMO_SEEN_KEY, new Date().toDateString());
    setIsOpen(false);
  };

  if (!isOpen || !promo) return null;

  const primaryColor = brandConfig?.theme?.primaryColor || '#41BAC2';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[90] animate-fade-in"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-scale-in pointer-events-auto">
          {/* Botão de fechar */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>

          {/* Imagem (se houver) */}
          {promo.image && (
            <div className="relative h-48 bg-gray-100">
              <img
                src={promo.image}
                alt={promo.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Conteúdo */}
          <div className="p-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              {promo.title}
            </h3>
            <p className="text-lg text-gray-700 mb-6">
              {promo.description}
            </p>

            {/* Cupom */}
            {promo.couponCode && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 text-center mb-2">
                  Use o cupom:
                </p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-bold tracking-wider" style={{ color: primaryColor }}>
                    {promo.couponCode}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(promo.couponCode!);
                      alert('Cupom copiado!');
                    }}
                    className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            )}

            {/* CTA */}
            {promo.ctaText && (
              <a
                href={promo.ctaLink || '/shop'}
                onClick={handleClose}
                className="block w-full py-4 px-6 text-center text-white font-bold rounded-lg transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: primaryColor }}
              >
                {promo.ctaText}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
