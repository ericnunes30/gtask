import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { cn } from "@/utils/utils";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]'
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  children,
  footer,
  className
}) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent 
        className={cn(
          sizeClasses[size],
          "max-h-[90vh] overflow-hidden",
          className
        )}
        onEscapeKeyDown={closeOnEscape ? undefined : (e) => e.preventDefault()}
        onPointerDownOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
      >
        <DialogHeader>
          {title ? (
            <DialogTitle>{title}</DialogTitle>
          ) : (
            <VisuallyHidden>
              <DialogTitle>Modal</DialogTitle>
            </VisuallyHidden>
          )}
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <VisuallyHidden>
              <DialogDescription>Modal content</DialogDescription>
            </VisuallyHidden>
          )}
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1">
          {children}
        </div>

        {footer && (
          <DialogFooter>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};