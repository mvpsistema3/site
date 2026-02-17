import React, { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';

const AGE_VERIFIED_KEY = 'age_verified';

/**
 * Popup de verificação de idade (+18)
 * Só aparece uma vez por sessão, usando localStorage
 */
export function AgeVerificationPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { brandConfig } = useBrand();

  useEffect(() => {
    // Verifica se já foi verificado
    const verified = localStorage.getItem(AGE_VERIFIED_KEY);
    if (!verified) {
      // Pequeno delay para não aparecer instantaneamente
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, 'true');
    setIsOpen(false);
  };

  const handleDeny = () => {
    // Redireciona para o Google se for menor de idade
    window.location.href = 'https://www.google.com';
  };

  if (!isOpen) return null;

  const primaryColor = brandConfig?.theme?.primaryColor || '#41BAC2';

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-fade-in">
        {/* Header com cor da marca */}
        <div
          className="py-6 px-8 text-center"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-4xl">🔞</span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            Verificação de Idade
          </h2>
        </div>

        {/* Conteúdo */}
        <div className="p-8 text-center">
          <p className="text-gray-700 text-lg mb-2">
            Este site contém conteúdo destinado
          </p>
          <p className="text-gray-900 text-xl font-bold mb-6">
            exclusivamente para maiores de 18 anos.
          </p>

          <p className="text-gray-600 mb-8">
            Ao continuar, você confirma que tem pelo menos 18 anos de idade.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 px-6 rounded-lg font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              Sim, tenho +18 anos
            </button>
            <button
              onClick={handleDeny}
              className="flex-1 py-4 px-6 rounded-lg font-bold bg-gray-200 text-gray-700 transition-all hover:bg-gray-300 active:scale-[0.98]"
            >
              Não, sou menor
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 py-4 px-8 text-center border-t">
          <p className="text-xs text-gray-500">
            Ao acessar este site, você concorda com nossos{' '}
            <a href="/termos" className="underline hover:text-gray-700">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="/privacidade" className="underline hover:text-gray-700">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
