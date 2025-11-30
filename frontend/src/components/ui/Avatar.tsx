import React from 'react';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  fallback,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const fallbackText = fallback || (alt ? alt.charAt(0).toUpperCase() : '?');

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500 text-white font-semibold ${className}`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span>{fallbackText}</span>
      )}
    </div>
  );
};

export default Avatar;
