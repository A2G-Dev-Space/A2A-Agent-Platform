import React from 'react';
import { clsx } from 'clsx';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl',
};

const statusClasses: Record<AvatarStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  status,
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const getFallbackText = () => {
    if (fallback) return fallback;
    if (alt) return alt.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <div className={clsx('relative inline-block', className)}>
      <div
        className={clsx(
          'rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700',
          'flex items-center justify-center font-medium',
          'text-text-light-primary dark:text-text-dark-primary',
          sizeClasses[size]
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{getFallbackText()}</span>
        )}
      </div>
      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-panel-light dark:ring-panel-dark',
            statusClasses[status],
            size === 'sm' && 'w-2 h-2',
            size === 'md' && 'w-2.5 h-2.5',
            size === 'lg' && 'w-3 h-3',
            size === 'xl' && 'w-4 h-4'
          )}
        />
      )}
    </div>
  );
};
