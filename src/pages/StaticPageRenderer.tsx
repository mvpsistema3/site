import React from 'react';
import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useStaticPage } from '../hooks/useStaticPages';
import { useBrandColors } from '../hooks/useTheme';
import { useBrand } from '../contexts/BrandContext';
import { SEOHead } from '../components/SEOHead';
import { BrandLink } from '../components/BrandLink';

// Skeleton for loading state
function StaticPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="container mx-auto px-4 pt-10 pb-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-gray-200 rounded-lg" />
          <div className="h-8 bg-gray-200 rounded w-64" />
        </div>
      </div>
      {/* Content skeleton */}
      <div className="container mx-auto px-4 pb-12 max-w-4xl space-y-4">
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-5 bg-gray-200 rounded w-5/6" />
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-8 bg-gray-200 rounded w-64 mt-8" />
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-5 bg-gray-200 rounded w-5/6" />
        <div className="h-5 bg-gray-200 rounded w-full" />
        <div className="h-5 bg-gray-200 rounded w-2/3" />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .animate-pulse > div > div {
          background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 50%, #e5e7eb 100%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

// 404 state
function PageNotFound() {
  return (
    <div className="animate-fade-in">
      <div className="container mx-auto px-4 py-24 text-center max-w-2xl">
        <FileText size={64} className="mx-auto mb-6 text-gray-300" />
        <h1 className="text-4xl font-bold mb-4">Página não encontrada</h1>
        <p className="text-gray-500 mb-8">
          A página que você está procurando não existe ou foi removida.
        </p>
        <BrandLink
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors"
        >
          Voltar à Loja
        </BrandLink>
      </div>
    </div>
  );
}

export function StaticPageRenderer() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = useStaticPage(slug || '');
  const { primaryColor } = useBrandColors();
  const { brandConfig } = useBrand();

  // Loading
  if (isLoading) {
    return <StaticPageSkeleton />;
  }

  // Not found
  if (!page || error) {
    return <PageNotFound />;
  }

  return (
    <div className="animate-fade-in">
      <SEOHead
        title={page.meta_title || page.title}
        description={page.meta_description || `${page.title} - ${brandConfig.name}`}
      />

      {/* Hero */}
      <div className="container mx-auto px-4 pt-10 pb-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <FileText size={18} style={{ color: primaryColor }} />
          </div>
          <h1 className="font-sans text-2xl md:text-3xl font-bold tracking-tight">
            {page.title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-12 md:pb-16 max-w-4xl">
        <div
          className="prose prose-lg mx-auto text-gray-800 max-w-none
            [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4
            [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-3
            [&_p]:mb-4 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1
            [&_li]:leading-relaxed
            [&_table]:w-full [&_table]:border-collapse
            [&_th]:text-left [&_th]:py-3 [&_th]:px-4 [&_th]:font-bold [&_th]:border-b-2 [&_th]:border-gray-200
            [&_td]:py-3 [&_td]:px-4 [&_td]:border-b [&_td]:border-gray-100
            [&_strong]:font-bold
            [&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-2
            [&_img]:rounded-lg [&_img]:shadow-lg"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
