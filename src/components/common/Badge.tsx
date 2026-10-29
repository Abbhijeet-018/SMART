import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    secondary: 'bg-sky-50 text-sky-700 border-sky-200/60',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    outline: 'bg-transparent text-slate-600 border-slate-300'
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium border',
    md: 'text-xs px-2.5 py-1 rounded-md font-medium border'
  };

  return (
    <span className={`inline-flex items-center gap-1 leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
};
