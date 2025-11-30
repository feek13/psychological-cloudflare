import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for keyboard navigation in dropdown menus
 * 下拉菜单键盘导航Hook
 *
 * @param isOpen - Whether the dropdown is open
 * @param optionsCount - Total number of options
 * @param onSelect - Callback when an option is selected
 * @param onClose - Callback to close the dropdown
 * @returns Current highlighted index and reset function
 */
export function useKeyboardNavigation(
  isOpen: boolean,
  optionsCount: number,
  onSelect: (index: number) => void,
  onClose: () => void
) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Reset highlighted index when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < optionsCount - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < optionsCount) {
            onSelect(highlightedIndex);
          }
          break;

        case 'Escape':
          event.preventDefault();
          onClose();
          break;

        case 'Home':
          event.preventDefault();
          setHighlightedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setHighlightedIndex(optionsCount - 1);
          break;

        default:
          break;
      }
    },
    [isOpen, highlightedIndex, optionsCount, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    highlightedIndex,
    setHighlightedIndex,
  };
}
