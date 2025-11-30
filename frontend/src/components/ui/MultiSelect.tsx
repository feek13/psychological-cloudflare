import { useState, useRef, useMemo, ReactNode } from 'react';
import { ChevronDown, Search, Check, X, Loader2 } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  showSelectAll?: boolean;
  maxSelected?: number;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  required?: boolean;
}

export default function MultiSelect({
  label,
  value = [],
  onChange,
  options,
  placeholder = '请选择',
  searchable = false,
  showSelectAll = false,
  maxSelected,
  error,
  disabled = false,
  loading = false,
  className,
  required = false,
}: MultiSelectProps) {
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

  // Find selected options
  const selectedOptions = useMemo(
    () => options.filter((opt) => value.includes(opt.value)),
    [options, value]
  );

  // Check if all options are selected
  const allSelected = useMemo(
    () => options.length > 0 && value.length === options.length,
    [options, value]
  );

  // Check if max selection limit reached
  const maxReached = useMemo(
    () => maxSelected !== undefined && value.length >= maxSelected,
    [maxSelected, value]
  );

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

  // Toggle option selection
  const handleToggleOption = (optionValue: string, optionDisabled?: boolean) => {
    if (optionDisabled) return;

    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : maxReached && !value.includes(optionValue)
      ? value
      : [...value, optionValue];

    onChange(newValue);
  };

  // Select all handler
  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.filter((opt) => !opt.disabled).map((opt) => opt.value));
    }
  };

  // Remove selected tag
  const handleRemoveTag = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  // Clear all
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

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
          ) : null}
          <span
            className={cn(
              'truncate',
              value.length === 0 && 'text-gray-400 dark:text-gray-500'
            )}
          >
            {value.length === 0 ? (
              placeholder
            ) : (
              <span className="flex items-center">
                <span className="inline-flex items-center justify-center w-5 h-5 mr-1.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full">
                  {value.length}
                </span>
                已选 {value.length} 项
                {maxSelected && ` (最多${maxSelected}项)`}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center ml-2 flex-shrink-0">
          {value.length > 0 && !disabled && (
            <X
              className="w-4 h-4 mr-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={handleClearAll}
            />
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-500 transition-transform duration-200',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </button>

      {/* Selected Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"
            >
              {option.icon && <span className="mr-1">{option.icon}</span>}
              {option.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveTag(option.value, e)}
                  className="ml-1.5 hover:text-primary-900 dark:hover:text-primary-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

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

          {/* Select All Button */}
          {showSelectAll && !searchQuery && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  'w-full flex items-center px-3 py-2',
                  'text-left text-sm font-medium',
                  'rounded-md',
                  'transition-colors duration-150',
                  'hover:bg-primary-50 dark:hover:bg-primary-900/20',
                  'text-primary-600 dark:text-primary-400'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 mr-2 border-2 rounded flex items-center justify-center',
                    allSelected
                      ? 'bg-primary-600 dark:bg-primary-500 border-primary-600 dark:border-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {allSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                {allSelected ? '取消全选' : '全选'}
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                暂无选项
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled =
                  option.disabled || (maxReached && !isSelected);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggleOption(option.value, isDisabled)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center px-4 py-2.5',
                      'text-left text-sm',
                      'transition-colors duration-150',
                      !isDisabled && 'cursor-pointer',
                      isDisabled && 'opacity-50 cursor-not-allowed',
                      isSelected &&
                        'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
                      !isSelected && 'text-gray-900 dark:text-white',
                      !isDisabled &&
                        'hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        'w-4 h-4 mr-3 border-2 rounded flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'bg-primary-600 dark:bg-primary-500 border-primary-600 dark:border-primary-500'
                          : 'border-gray-300 dark:border-gray-600'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

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
