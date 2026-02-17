import React from 'react';

export function ShopPageSkeleton() {
  return (
    <div className="container mx-auto px-6 md:px-8 lg:px-12 py-6 md:py-8 animate-pulse">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

        {/* Sidebar Skeleton (Desktop) */}
        <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0 space-y-8">
          {/* Categorias */}
          <div>
            <div className="h-5 bg-gray-200 rounded w-28 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <div className="h-5 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded flex-1"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Cores */}
          <div>
            <div className="h-5 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-10 h-10 bg-gray-200 rounded-full"></div>
              ))}
            </div>
          </div>

          {/* Tamanhos */}
          <div>
            <div className="h-5 bg-gray-200 rounded w-28 mb-4"></div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="h-11 bg-gray-200 rounded flex-1 sm:flex-none sm:w-24"></div>
              <div className="h-11 bg-gray-200 rounded flex-1 sm:flex-none sm:w-40"></div>
            </div>
          </div>

          {/* Product Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-4">
                {/* Image */}
                <div className="aspect-square bg-gray-200 rounded-lg"></div>
                {/* Title */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                {/* Price */}
                <div className="h-6 bg-gray-200 rounded w-24"></div>
                {/* Colors */}
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shimmer Effect */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-pulse > div > * {
          background: linear-gradient(
            90deg,
            #e5e7eb 0%,
            #f3f4f6 50%,
            #e5e7eb 100%
          );
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
