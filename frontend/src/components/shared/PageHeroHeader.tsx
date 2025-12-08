import { memo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface PageHeroHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

// CSS-based organic blob (optimized, no framer-motion)
const CSSBlob = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 200 200" className={className} style={style}>
    <path
      fill="currentColor"
      d="M45.7,-62.2C58.9,-54.3,68.9,-40.7,74.3,-25.4C79.7,-10.1,80.5,6.9,75.4,21.8C70.3,36.7,59.3,49.4,45.8,58.5C32.3,67.6,16.2,73,-0.8,74.1C-17.8,75.2,-35.6,72,-49.4,62.7C-63.2,53.4,-73,38,-77.3,21.3C-81.6,4.6,-80.4,-13.4,-73.1,-28.3C-65.8,-43.2,-52.4,-55,-37.8,-62.4C-23.2,-69.8,-7.4,-72.8,6.5,-81.4C20.4,-90,32.5,-70.1,45.7,-62.2Z"
      transform="translate(100 100)"
    />
  </svg>
);

const PageHeroHeader = memo(({
  icon: Icon,
  title,
  subtitle,
  children,
  className = '',
}: PageHeroHeaderProps) => {
  return (
    <div className={`relative overflow-hidden pt-16 ${className}`}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary-900/90 to-secondary-900/80 dark:from-slate-900 dark:via-primary-900/90 dark:to-secondary-900/80" />

      {/* Light mode gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 dark:opacity-0 transition-opacity duration-300" />

      {/* Animated Blobs */}
      <CSSBlob
        className="absolute -top-20 -left-20 w-72 h-72 text-primary-500/20 dark:text-primary-400/15 blob-animate-1"
        style={{ filter: 'blur(40px)' }}
      />
      <CSSBlob
        className="absolute -bottom-20 -right-20 w-80 h-80 text-secondary-500/20 dark:text-secondary-400/15 blob-animate-2"
        style={{ filter: 'blur(50px)' }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Icon */}
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-2xl blur-lg opacity-50" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 p-[2px] shadow-2xl">
                <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-white/70 text-sm md:text-base max-w-md">
                {subtitle}
              </p>
            )}

            {/* Children (search bar, filters, etc.) */}
            {children && (
              <motion.div
                className="mt-6 w-full max-w-2xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {children}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute -bottom-px left-0 right-0">
        <svg viewBox="0 0 1440 80" className="w-full h-auto block">
          <path
            fill="currentColor"
            className="text-gray-50 dark:text-gray-900"
            d="M0,48L60,42.7C120,37,240,27,360,32C480,37,600,59,720,64C840,69,960,59,1080,48C1200,37,1320,27,1380,21.3L1440,16L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z"
          />
        </svg>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(20px, -15px) scale(1.05) rotate(5deg); }
          66% { transform: translate(-15px, 15px) scale(0.95) rotate(-5deg); }
        }
        @keyframes blob-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(-30px, 20px) scale(1.08) rotate(-8deg); }
          66% { transform: translate(20px, -15px) scale(0.92) rotate(8deg); }
        }
        .blob-animate-1 {
          animation: blob-float-1 20s ease-in-out infinite;
          will-change: transform;
        }
        .blob-animate-2 {
          animation: blob-float-2 25s ease-in-out infinite;
          will-change: transform;
        }
      `}</style>
    </div>
  );
});

PageHeroHeader.displayName = 'PageHeroHeader';

export default PageHeroHeader;
