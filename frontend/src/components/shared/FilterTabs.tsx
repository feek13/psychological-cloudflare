import { memo } from 'react';
import { motion } from 'framer-motion';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

const FilterTabs = memo(({
  tabs,
  activeTab,
  onChange,
  className = '',
}: FilterTabsProps) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              isActive
                ? 'text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white/60 dark:bg-white/[0.06] hover:bg-white dark:hover:bg-white/[0.1] border border-gray-200/50 dark:border-white/[0.08]'
            }`}
          >
            {/* Active background */}
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full shadow-lg"
                style={{
                  boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
                }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}

            {/* Content */}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
});

FilterTabs.displayName = 'FilterTabs';

export default FilterTabs;
