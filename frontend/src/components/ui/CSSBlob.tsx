/**
 * CSS Blob Component
 * Organic blob shapes with CSS animations (no framer-motion for better performance)
 */

import React from 'react';

// Predefined blob path shapes
const BLOB_PATHS = {
  // Login page blob shape
  variant1: 'M45.7,-62.2C58.9,-53.5,69.1,-39.5,74.2,-23.6C79.3,-7.7,79.3,10.1,73.1,25.3C66.9,40.5,54.5,53.1,40.1,61.5C25.7,69.9,9.3,74.1,-7.5,73.8C-24.3,73.5,-41.5,68.7,-54.1,58.5C-66.7,48.3,-74.7,32.7,-77.8,15.8C-80.9,-1.1,-79.1,-19.3,-71.4,-33.8C-63.7,-48.3,-50.1,-59.1,-35.5,-67.1C-20.9,-75.1,-5.2,-80.3,7.8,-78.8C20.8,-77.3,32.5,-70.9,45.7,-62.2Z',
  // Register page blob shape
  variant2: 'M44.5,-51.2C58.6,-40.8,71.8,-27.5,75.8,-11.5C79.8,4.5,74.6,23.2,64.1,37.8C53.6,52.4,37.8,62.9,20.1,68.5C2.4,74.1,-17.2,74.8,-33.7,68C-50.2,61.2,-63.6,46.9,-71.2,29.6C-78.8,12.3,-80.6,-8,-74.1,-24.5C-67.6,-41,-52.8,-53.7,-37.1,-63.8C-21.4,-73.9,-4.8,-81.4,9.6,-78.5C24,-75.6,30.4,-61.6,44.5,-51.2Z',
};

interface CSSBlobProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: keyof typeof BLOB_PATHS;
  path?: string;
}

export default function CSSBlob({
  className,
  style,
  variant = 'variant1',
  path,
}: CSSBlobProps) {
  const blobPath = path || BLOB_PATHS[variant];

  return (
    <svg viewBox="0 0 200 200" className={className} style={style}>
      <path
        fill="currentColor"
        d={blobPath}
        transform="translate(100 100)"
      />
    </svg>
  );
}

/**
 * Blob Animation Styles Component
 * Include this once in your auth pages to get blob animations
 */
export function BlobAnimationStyles({ paused = false }: { paused?: boolean }) {
  return (
    <style>{`
      @keyframes blob-breathe-1 {
        0%, 100% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(1.03) rotate(3deg); }
      }
      @keyframes blob-breathe-2 {
        0%, 100% { transform: scale(1) rotate(0deg); }
        50% { transform: scale(0.97) rotate(-3deg); }
      }
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .blob-animate-1 {
        animation: blob-breathe-1 10s ease-in-out infinite, fade-in 1s ease-out;
        will-change: transform;
      }
      .blob-animate-2 {
        animation: blob-breathe-2 12s ease-in-out infinite, fade-in 1s ease-out 0.5s both;
        will-change: transform;
      }
      .blob-paused {
        animation-play-state: paused;
      }
    `}</style>
  );
}
