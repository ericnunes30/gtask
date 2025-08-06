import { useState, useCallback, useEffect } from 'react';

export interface UseModalOptions {
  initialOpen?: boolean;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useModal = (options: UseModalOptions = {}): UseModalReturn => {
  const [isOpen, setIsOpen] = useState(options.initialOpen ?? false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    options.onClose?.();
  }, [options.onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || options.closeOnEscape === false) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, options.closeOnEscape]);

  return {
    isOpen,
    open,
    close,
    toggle
  };
};