import React from 'react';
import { BaseModal } from './BaseModal';

interface ModalSkeletonProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalSkeleton: React.FC<ModalSkeletonProps> = ({ isOpen, onClose }) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      className="max-w-[95vw] max-h-[90vh]"
    >
      <div className="flex h-full min-h-[600px] animate-pulse">
        {/* Left Panel Skeleton */}
        <div className="w-1/2 flex flex-col h-full">
          {/* Header Skeleton */}
          <div className="p-6 border-b">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-7 bg-gray-200 rounded-md w-3/4 mb-3"></div>
              </div>
              <div className="flex gap-2 ml-4">
                <div className="h-9 w-20 bg-gray-200 rounded-md"></div>
                <div className="h-9 w-16 bg-gray-200 rounded-md"></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-5 w-20 bg-gray-200 rounded"></div>
                <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-20 bg-gray-200 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
              </div>
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/5"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form Skeleton */}
          <div className="flex-1 p-6 space-y-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-4 bg-gray-200 rounded"></div>
                <div className="w-28 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel Skeleton */}
        <div className="w-1/2 flex flex-col h-full border-l">
          {/* Header Skeleton */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="h-6 w-20 bg-gray-200 rounded"></div>
              <div className="flex gap-1">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          {/* Activity List Skeleton */}
          <div className="flex-1 p-6">
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-16 bg-gray-200 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment Input Skeleton */}
          <div className="p-4 border-t">
            <div className="flex gap-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-20 bg-gray-200 rounded-md"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};