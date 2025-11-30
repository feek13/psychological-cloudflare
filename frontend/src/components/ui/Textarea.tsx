import React from 'react';

interface TextareaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  className?: string;
  disabled?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
  maxLength,
  showCount = false,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={`
          w-full px-4 py-2 rounded-lg border shadow-inner-soft
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          ${error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
          }
          focus:ring-2 focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          resize-none
        `}
      />
      <div className="flex justify-between items-center mt-1">
        <div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
        </div>
        {showCount && maxLength && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {value.length} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
};

export default Textarea;
