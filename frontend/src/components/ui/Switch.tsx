import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <label className={`flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={`
            w-14 h-7 rounded-full shadow-inner transition-colors duration-200
            ${checked
              ? 'bg-gradient-to-r from-primary-500 to-primary-600'
              : 'bg-gray-300 dark:bg-gray-600'
            }
          `}
        />
        <div
          className={`
            absolute left-1 top-1 w-5 h-5 rounded-full shadow-md
            bg-white transition-transform duration-200 ease-in-out
            ${checked ? 'transform translate-x-7' : ''}
          `}
        />
      </div>
      {label && (
        <span className="ml-3 text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </label>
  );
};

export default Switch;
