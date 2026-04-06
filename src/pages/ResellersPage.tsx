import React from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useBrandColors } from '../hooks/useTheme';
import { Package, Percent, Truck, MessageCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const benefits = [
  {
    icon: Percent,
    title: 'Preços Exclusivos',
    description: 'Descontos progressivos de acordo com o volume do pedido.',
  },
  {
    icon: Package,
    title: 'Compra no Atacado',
    description: 'Condições especiais para pedidos em grandes quantidades.',
  },
  {
    icon: Truck,
    title: 'Logística Dedicada',
    description: 'Frete diferenciado e prazos de entrega prioritários.',
  },
  {
    icon: ShieldCheck,
    title: 'Produtos Originais',
    description: 'Garantia de autenticidade em todos os produtos.',
  },
  {
    icon: TrendingUp,
    title: 'Alta Margem de Lucro',
    description: 'Preços competitivos que garantem rentabilidade para o seu negócio.',
  },
  {
    icon: MessageCircle,
    title: 'Suporte Dedicado',
    description: 'Atendimento exclusivo para revendedores via WhatsApp.',
  },
];

export const ResellersPage: React.FC = () => {
  const { brand } = useBrand();
  const { primaryColor } = useBrandColors();
  const contactConfig = (brand?.settings as Record<string, any>)?.contact || {};
  const whatsappNumber = contactConfig.whatsapp || '5521999999999';
  const whatsappMessage = encodeURIComponent('Olá! Tenho interesse em ser revendedor(a). Gostaria de saber mais sobre as condições de atacado.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section
        className="relative py-20 md:py-28 overflow-hidden"
        style={{ backgroundColor: `${primaryColor}08` }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: primaryColor }}
        />
        <div className="container mx-auto px-6 md:px-8 lg:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span
              className="inline-block text-xs font-bold uppercase tracking-[0.2em] mb-4"
              style={{ color: primaryColor }}
            >
              Programa de Revendedores
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
              Seja um Revendedor
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Faça parte do nosso time de revendedores e tenha acesso a{' '}
              <strong className="text-gray-900">condições exclusivas</strong> para compra no atacado.
              Preços especiais, suporte dedicado e alta margem de lucro para o seu negócio.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Vantagens para Revendedores
            </h2>
            <p className="text-gray-500 mt-3 text-sm md:text-base">
              Conheça os benefícios exclusivos do nosso programa de atacado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group p-6 rounded-xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300"
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300"
                  style={{ backgroundColor: `${primaryColor}12` }}
                >
                  <benefit.icon
                    size={20}
                    strokeWidth={2}
                    style={{ color: primaryColor }}
                  />
                </div>
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-4">
              Como Funciona?
            </h2>
            <p className="text-gray-500 mb-12 text-sm md:text-base">
              Começar a revender é simples e rápido.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '01', title: 'Entre em Contato', desc: 'Fale com nosso time pelo WhatsApp e informe seu interesse.' },
                { step: '02', title: 'Receba sua Tabela', desc: 'Enviamos os preços exclusivos de atacado para você.' },
                { step: '03', title: 'Comece a Revender', desc: 'Faça seu pedido e comece a lucrar com nossos produtos.' },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="text-center"
                >
                  <div
                    className="text-4xl font-black mb-3 opacity-20"
                    style={{ color: primaryColor }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-6 md:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-4">
              Quer Saber Mais?
            </h2>
            <p className="text-gray-600 mb-8 text-base md:text-lg leading-relaxed">
              Entre em contato com nosso time comercial pelo WhatsApp. Estamos prontos para
              apresentar todas as condições especiais e tirar suas dúvidas.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Falar com o Time Comercial
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
