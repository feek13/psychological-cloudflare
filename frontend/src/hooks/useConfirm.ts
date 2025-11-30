import { useContext } from 'react';
import { ConfirmContext } from '@/contexts/ConfirmContext';

/**
 * Hook to access the confirm dialog functionality
 *
 * @example
 * ```tsx
 * const confirm = useConfirm();
 *
 * // Simple usage
 * const result = await confirm('确定要删除吗？');
 * if (result) {
 *   // User clicked confirm
 * }
 *
 * // Advanced usage with options
 * const result = await confirm({
 *   title: '删除确认',
 *   message: '确定要删除这个项目吗？此操作不可撤销。',
 *   confirmText: '删除',
 *   cancelText: '取消',
 *   variant: 'danger'
 * });
 * ```
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }

  return context.confirm;
}
