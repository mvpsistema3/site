import React, { useState, useMemo } from 'react';
import { HelpCircle, Minus, Plus, Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFAQs, type FAQ } from '../hooks/useFAQs';
import { useBrandColors } from '../hooks/useTheme';
import { useBrand } from '../contexts/BrandContext';
import { SEOHead } from '../components/SEOHead';
import { BrandLink } from '../components/BrandLink';

// Skeleton for loading state
function FAQSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-gray-200 rounded" style={{
          background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%)',
          backgroundSize: '1000px 100%',
          animation: 'shimmer 2s infinite',
        }} />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
      `}</style>
    </div>
  );
}

// Group FAQs by category
function groupByCategory(faqs: FAQ[]): Record<string, FAQ[]> {
  return faqs.reduce<Record<string, FAQ[]>>((acc, faq) => {
    const cat = faq.category || 'geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});
}

// Capitalize category name for display
function formatCategoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function FAQPage() {
  const { data: faqs, isLoading } = useFAQs();
  const { primaryColor } = useBrandColors();
  const { brandConfig } = useBrand();
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  // Group and filter FAQs
  const grouped = useMemo(() => {
    if (!faqs) return {};
    return groupByCategory(faqs);
  }, [faqs]);

  const categories = useMemo(() => Object.keys(grouped), [grouped]);
  const hasMultipleCategories = categories.length > 1;

  // Filter by search and category
  const filteredFaqs = useMemo(() => {
    if (!faqs) return [];
    let result = faqs;

    if (activeCategory) {
      result = result.filter(f => (f.category || 'geral') === activeCategory);
    }

    if (searchQuery.trim().length >= 2) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query)
      );
    }

    return result;
  }, [faqs, activeCategory, searchQuery]);

  return (
    <div className="animate-fade-in">
      <SEOHead
        title="Perguntas Frequentes"
        description={`Encontre respostas para as perguntas mais frequentes sobre a ${brandConfig.name}.`}
      />

      {/* Hero */}
      <div className="container mx-auto px-4 pt-10 pb-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <HelpCircle size={18} style={{ color: primaryColor }} />
          </div>
          <h1 className="font-sans text-2xl md:text-3xl font-bold tracking-tight">
            Perguntas Frequentes
          </h1>
        </div>
        <p className="text-gray-400 text-sm ml-12">Tudo o que você precisa saber.</p>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-12 md:pb-16 max-w-3xl">

        {/* Search */}
        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar pergunta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black text-sm"
          />
        </div>

        {/* Category tabs */}
        {hasMultipleCategories && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                activeCategory === null
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeCategory === null ? { backgroundColor: primaryColor } : {}}
            >
              Todas
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  activeCategory === cat
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeCategory === cat ? { backgroundColor: primaryColor } : {}}
              >
                {formatCategoryLabel(cat)}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && <FAQSkeleton />}

        {/* FAQ list */}
        {!isLoading && filteredFaqs.length > 0 && (
          <div className="space-y-2">
            {filteredFaqs.map((faq) => (
              <div
                key={faq.id}
                className="border border-gray-200 rounded hover:border-black transition-colors bg-gray-50/50"
              >
                <button
                  className="w-full flex justify-between items-center p-5 text-left font-bold text-sm uppercase tracking-wide focus:outline-none"
                  onClick={() => toggle(faq.id)}
                >
                  <span style={openId === faq.id ? { color: primaryColor } : {}}>
                    {faq.question}
                  </span>
                  {openId === faq.id ? <Minus size={18} /> : <Plus size={18} />}
                </button>

                <AnimatePresence>
                  {openId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div
                        className="p-5 pt-0 text-gray-600 text-sm leading-relaxed border-t border-dashed border-gray-200 mt-2"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-2">
              {searchQuery ? 'Nenhum resultado encontrado.' : 'Em breve adicionaremos perguntas frequentes.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory(null); }}
                className="text-sm underline text-gray-500 hover:text-black"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center border-t border-gray-100 pt-10">
          <p className="text-sm text-gray-500 mb-4">Não encontrou o que procurava?</p>
          <BrandLink
            to="/page/contato"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-black rounded font-bold text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
          >
            Fale Conosco <ArrowRight size={16} />
          </BrandLink>
        </div>
      </div>
    </div>
  );
}
