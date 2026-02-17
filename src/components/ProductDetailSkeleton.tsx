import React from 'react';

export function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="hidden sm:flex items-center gap-2 mb-6 lg:mb-8">
        <div className="h-3 bg-gray-200 rounded w-10"></div>
        <div className="h-3 bg-gray-200 rounded w-1"></div>
        <div className="h-3 bg-gray-200 rounded w-16"></div>
        <div className="h-3 bg-gray-200 rounded w-1"></div>
        <div className="h-3 bg-gray-200 rounded w-32"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 xl:gap-16 mb-10 md:mb-16">
        {/* Gallery Skeleton */}
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
          {/* Thumbnails */}
          <div className="order-2 lg:order-1 flex lg:flex-col gap-2 lg:w-[68px]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-14 sm:w-16 lg:w-[68px] aspect-square bg-gray-200 rounded-lg flex-shrink-0"></div>
            ))}
          </div>
          {/* Main Image */}
          <div className="order-1 lg:order-2 flex-1 aspect-[3/4] sm:aspect-square lg:aspect-[4/5] bg-gray-200 rounded-xl"></div>
        </div>

        {/* Info Skeleton */}
        <div className="flex flex-col space-y-5">
          {/* Title */}
          <div className="space-y-2.5">
            <div className="h-7 bg-gray-200 rounded w-4/5"></div>
            <div className="h-7 bg-gray-200 rounded w-3/5"></div>
          </div>

          {/* Price */}
          <div className="pb-6 border-b border-gray-100 space-y-2">
            <div className="h-9 bg-gray-200 rounded w-36"></div>
            <div className="h-4 bg-gray-200 rounded w-52"></div>
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
            <div className="flex gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 bg-gray-200 rounded-full"></div>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded w-28"></div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-12 h-11 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <div className="flex-1 h-12 md:h-14 bg-gray-200 rounded-lg"></div>
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-200 rounded-lg"></div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 sm:h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Accordions Skeleton */}
      <div className="max-w-3xl mx-auto mb-10 md:mb-16 space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-gray-200 rounded-xl"></div>
        ))}
      </div>

      {/* Related Products Skeleton */}
      <div className="border-t border-gray-100 pt-10 md:pt-16">
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] sm:aspect-square bg-gray-200 rounded-xl"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
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

        .animate-pulse > * {
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
