import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccordionSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface ProductAccordionProps {
  sections: AccordionSection[];
  defaultOpen?: string;
}

export function ProductAccordion({ sections, defaultOpen }: ProductAccordionProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(defaultOpen ? [defaultOpen] : [])
  );

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const isOpen = openSections.has(section.id);

        return (
          <div
            key={section.id}
            className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-gray-300 transition-colors"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 text-gray-700">
                  {section.icon}
                </div>
                <span className="font-bold text-sm md:text-base text-gray-900">
                  {section.title}
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 pt-1 text-sm md:text-base text-gray-600 leading-relaxed border-t border-gray-100">
                    {section.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
