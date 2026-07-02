import React from 'react';

export default function ProductCardSkeleton() {
  return (
    <div className="card w-full max-w-sm bg-base-200/50 backdrop-blur-md shadow-xl border border-white/5 animate-pulse flex flex-col h-full">
      <div className="h-56 bg-base-300 w-full shrink-0"></div>
      <div className="card-body p-6 flex flex-col flex-grow">
        <div className="h-6 bg-base-300 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-base-300 rounded w-1/4 mb-4"></div>
        <div className="space-y-2 flex-grow mt-2">
          <div className="h-4 bg-base-300 rounded w-full"></div>
          <div className="h-4 bg-base-300 rounded w-5/6"></div>
          <div className="h-4 bg-base-300 rounded w-4/6"></div>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <div className="h-8 bg-base-300 rounded w-1/3"></div>
          <div className="h-10 bg-base-300 rounded-full w-full"></div>
        </div>
      </div>
    </div>
  );
}
