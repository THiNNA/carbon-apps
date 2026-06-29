import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'text-emerald-600',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-transparent border-current ${sizeClasses[size]} ${color}`}
      ></div>
    </div>
  );
};
