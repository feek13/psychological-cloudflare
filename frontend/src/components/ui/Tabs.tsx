/**
 * Tabs Component
 * 选项卡导航组件 - 支持深色模式的可复用选项卡
 */
import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'default',
  size = 'md',
}: TabsProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    default: {
      container: 'border-b border-gray-200 dark:border-gray-700',
      tab: 'border-b-2 transition-colors duration-200',
      active: 'border-primary-500 text-primary-600 dark:text-primary-400',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600',
      disabled: 'opacity-50 cursor-not-allowed',
    },
    pills: {
      container: 'bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
      tab: 'rounded-md transition-all duration-200',
      active: 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm',
      inactive: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
      disabled: 'opacity-50 cursor-not-allowed',
    },
    underline: {
      container: 'space-x-8',
      tab: 'border-b-2 transition-colors duration-200 pb-2',
      active: 'border-primary-500 text-primary-600 dark:text-primary-400 font-semibold',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
      disabled: 'opacity-50 cursor-not-allowed',
    },
  };

  const containerClass = `flex ${variantClasses[variant].container} ${className}`;

  return (
    <div className={containerClass}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isDisabled = tab.disabled;

        const tabClass = `
          ${sizeClasses[size]}
          ${variantClasses[variant].tab}
          ${isActive ? variantClasses[variant].active : variantClasses[variant].inactive}
          ${isDisabled ? variantClasses[variant].disabled : 'cursor-pointer'}
          flex items-center gap-2 whitespace-nowrap font-medium
        `.trim();

        const handleClick = () => {
          if (!isDisabled) {
            onChange(tab.id);
          }
        };

        return (
          <button
            key={tab.id}
            onClick={handleClick}
            disabled={isDisabled}
            className={tabClass}
            type="button"
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
