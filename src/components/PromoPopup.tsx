import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import { useQuery } from '@tanstack/react-query';
import { supabasePublic } from '../lib/supabase';

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

function useActivePromo() {
  const { brand } = useBrand();

  return useQuery({
    queryKey: ['active-promo', brand?.id],
    queryFn: async () => {
      if (!brand?.id) return null;

      const { data, error } = await supabasePublic
        .from('promos')
        .select('id, title, description, image, coupon_code, cta_text, cta_link')
        .eq('brand_id', brand.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        image: data.image,
        couponCode: data.coupon_code,
        ctaText: data.cta_text,
        ctaLink: data.cta_link,
      } as Promo;
    },
    enabled: !!brand?.id,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Popup promocional
 * Aparece uma vez por dia se houver promoção ativa no banco
 */
export function PromoPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { brandConfig } = useBrand();
  const { data: promo } = useActivePromo();

  useEffect(() => {
    if (!promo) return;

    const lastSeen = localStorage.getItem(PROMO_SEEN_KEY);
    const today = new Date().toDateString();

    if (lastSeen !== today) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [promo]);

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
