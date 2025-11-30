import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient-primary' | 'gradient-secondary' | 'gradient-health';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, iconLeft, iconRight, fullWidth, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg hover:scale-105 focus:ring-primary-500',
      secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 hover:shadow-lg hover:scale-105 focus:ring-secondary-500',
      outline: 'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-105 focus:ring-gray-500',
      ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:scale-105 focus:ring-red-500',
      'gradient-primary': 'bg-gradient-primary text-white hover:shadow-glow-primary hover:scale-105 focus:ring-primary-500',
      'gradient-secondary': 'bg-gradient-secondary text-white hover:shadow-glow-secondary hover:scale-105 focus:ring-secondary-500',
      'gradient-health': 'bg-gradient-health text-white hover:shadow-lift hover:scale-105 focus:ring-primary-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!isLoading && iconLeft && <span className="inline-flex">{iconLeft}</span>}
        {children}
        {!isLoading && iconRight && <span className="inline-flex">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
