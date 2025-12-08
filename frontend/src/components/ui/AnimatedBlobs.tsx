import { memo } from 'react';

interface BlobProps {
  className?: string;
  color?: string;
  size?: number;
  x?: number;
  y?: number;
  animationDelay?: string;
  animationDuration?: string;
}

// Use pure CSS animations for better performance
const Blob = memo(({
  color = 'rgba(20, 184, 166, 0.3)',
  size = 400,
  x = 0,
  y = 0,
  animationDelay = '0s',
  animationDuration = '20s',
}: BlobProps) => {
  return (
    <div
      className="absolute rounded-full blur-2xl will-change-transform"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        animation: `blob-float ${animationDuration} ease-in-out infinite`,
        animationDelay,
      }}
    />
  );
});

Blob.displayName = 'Blob';

interface AnimatedBlobsProps {
  variant?: 'default' | 'profile' | 'calm' | 'minimal';
  className?: string;
}

// Reduced blob configs for better performance
const blobConfigs = {
  default: [
    { color: 'rgba(20, 184, 166, 0.2)', size: 450, x: 20, y: 25, animationDelay: '0s', animationDuration: '25s' },
    { color: 'rgba(168, 85, 247, 0.15)', size: 380, x: 75, y: 35, animationDelay: '5s', animationDuration: '30s' },
  ],
  profile: [
    { color: 'rgba(20, 184, 166, 0.15)', size: 500, x: 15, y: 20, animationDelay: '0s', animationDuration: '30s' },
    { color: 'rgba(168, 85, 247, 0.12)', size: 420, x: 80, y: 25, animationDelay: '8s', animationDuration: '35s' },
    { color: 'rgba(14, 165, 233, 0.1)', size: 350, x: 60, y: 75, animationDelay: '15s', animationDuration: '28s' },
  ],
  calm: [
    { color: 'rgba(20, 184, 166, 0.12)', size: 600, x: 30, y: 30, animationDelay: '0s', animationDuration: '40s' },
    { color: 'rgba(168, 85, 247, 0.08)', size: 450, x: 70, y: 60, animationDelay: '10s', animationDuration: '35s' },
  ],
  minimal: [
    { color: 'rgba(20, 184, 166, 0.1)', size: 500, x: 25, y: 30, animationDelay: '0s', animationDuration: '35s' },
  ],
};

const AnimatedBlobs = memo(({ variant = 'default', className = '' }: AnimatedBlobsProps) => {
  const blobs = blobConfigs[variant];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* CSS keyframes for blob animation */}
      <style>{`
        @keyframes blob-float {
          0%, 100% {
            transform: translate(-50%, -50%) translate(0, 0) scale(1);
          }
          25% {
            transform: translate(-50%, -50%) translate(20px, -15px) scale(1.02);
          }
          50% {
            transform: translate(-50%, -50%) translate(-10px, 20px) scale(0.98);
          }
          75% {
            transform: translate(-50%, -50%) translate(15px, 10px) scale(1.01);
          }
        }
      `}</style>
      {blobs.map((blob, index) => (
        <Blob key={index} {...blob} />
      ))}
    </div>
  );
});

AnimatedBlobs.displayName = 'AnimatedBlobs';

export default AnimatedBlobs;
