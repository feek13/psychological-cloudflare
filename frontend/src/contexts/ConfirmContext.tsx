import { createContext, useState, useCallback, ReactNode } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextValue {
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
}

export const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

interface ConfirmProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    message: '',
  });
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: string | ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmOptions: ConfirmOptions = typeof opts === 'string'
        ? { message: opts }
        : opts;

      setOptions(confirmOptions);
      setIsOpen(true);
      setResolveCallback(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback(true);
      setResolveCallback(null);
    }
  }, [resolveCallback]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveCallback) {
      resolveCallback(false);
      setResolveCallback(null);
    }
  }, [resolveCallback]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}
