import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md';
  outline?: boolean;
  pulse?: boolean;
  dot?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'xs',
  outline = false,
  pulse = false,
  dot = false,
  className,
}: BadgeProps) {
  const variants = outline ? {
    default: 'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent',
    success: 'border-2 border-green-500 text-green-700 dark:text-green-400 bg-transparent',
    warning: 'border-2 border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-transparent',
    danger: 'border-2 border-red-500 text-red-700 dark:text-red-400 bg-transparent',
    info: 'border-2 border-blue-500 text-blue-700 dark:text-blue-400 bg-transparent',
  } : {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-sm',
    md: 'px-3 py-1.5 text-base',
  };

  const dotColors = {
    default: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variants[variant],
        sizes[size],
        pulse && 'animate-pulse',
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant], pulse && 'animate-pulse-slow')} />
      )}
      {children}
    </span>
  );
}
