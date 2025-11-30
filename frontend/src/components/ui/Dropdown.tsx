import { useState, useRef, useMemo, ReactNode } from 'react';
import { ChevronDown, Search, Check, Loader2 } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  searchable?: boolean;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  required?: boolean;
}

export default function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder = '请选择',
  searchable = false,
  error,
  disabled = false,
  loading = false,
  className,
  required = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Find selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown handler
  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  // Open dropdown handler
  const handleOpen = () => {
    if (!disabled && !loading) {
      setIsOpen(true);
      // Focus search input when opened if searchable
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  };

  // Toggle dropdown
  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  // Select option handler
  const handleSelect = (option: DropdownOption) => {
    if (!option.disabled) {
      onChange(option.value);
      handleClose();
    }
  };

  // Keyboard navigation
  const { highlightedIndex, setHighlightedIndex } = useKeyboardNavigation(
    isOpen,
    filteredOptions.length,
    (index) => {
      const option = filteredOptions[index];
      if (option) {
        handleSelect(option);
      }
    },
    handleClose
  );

  // Click outside to close
  useClickOutside(dropdownRef, handleClose);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || loading}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5',
          'bg-white dark:bg-gray-800 border rounded-lg',
          'text-left text-gray-900 dark:text-white',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          !disabled && !loading && 'hover:bg-gray-50 dark:hover:bg-gray-700',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900',
          error
            ? 'border-red-500 dark:border-red-500'
            : 'border-gray-300 dark:border-gray-600',
          isOpen && 'ring-2 ring-primary-500 border-transparent'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center flex-1 min-w-0">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-500" />
          ) : selectedOption?.icon ? (
            <span className="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0">
              {selectedOption.icon}
            </span>
          ) : null}
          <span
            className={cn(
              'truncate',
              !selectedOption && 'text-gray-400 dark:text-gray-500'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 ml-2 text-gray-500 transition-transform duration-200 flex-shrink-0',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-full',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            'transform transition-all duration-200 ease-out',
            'origin-top animate-in fade-in zoom-in-95'
          )}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className={cn(
                    'w-full pl-9 pr-3 py-2',
                    'bg-gray-50 dark:bg-gray-900',
                    'border border-gray-200 dark:border-gray-700',
                    'rounded-md',
                    'text-sm text-gray-900 dark:text-white',
                    'placeholder-gray-400 dark:placeholder-gray-500',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                  )}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                暂无选项
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    disabled={option.disabled}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5',
                      'text-left text-sm',
                      'transition-colors duration-150',
                      !option.disabled && 'cursor-pointer',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                      isSelected &&
                        'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
                      !isSelected &&
                        !isHighlighted &&
                        'text-gray-900 dark:text-white',
                      !isSelected &&
                        isHighlighted &&
                        'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
                      !isSelected &&
                        !option.disabled &&
                        'hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {option.icon && (
                        <span className="mr-2 flex-shrink-0">{option.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{option.label}</div>
                        {option.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 ml-2 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
