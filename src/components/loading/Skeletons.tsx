import React from "react";

// Loading components for different route types
export const PageSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
);

export const TableSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-10 bg-gray-200 rounded"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 rounded"></div>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i}>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    ))}
    <div className="h-10 bg-gray-200 rounded w-1/4"></div>
  </div>
);

// Loading component for route transitions
export const RouteLoading = () => (
  <div className="flex items-center justify-center min-h-96">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);
