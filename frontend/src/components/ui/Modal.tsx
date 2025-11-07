import React from 'react';
import { clsx } from 'clsx';
import * as Dialog from '@radix-ui/react-dialog';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl',
};

export const Modal: React.FC<ModalProps> & {
  Header: typeof ModalHeader;
  Body: typeof ModalBody;
  Footer: typeof ModalFooter;
} = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={clsx(
            'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
            'w-full p-4',
            sizeClasses[size],
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          <div className="rounded-xl bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {(title || description) && (
              <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                <div className="flex flex-col gap-1">
                  {title && (
                    <Dialog.Title className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                      {title}
                    </Dialog.Title>
                  )}
                  {description && (
                    <Dialog.Description className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      {description}
                    </Dialog.Description>
                  )}
                </div>
                <Dialog.Close className="p-1 rounded-full text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <span className="material-symbols-outlined">close</span>
                </Dialog.Close>
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {children}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={clsx('px-6 py-4 border-b border-border-light dark:border-border-dark', className)}>
      {children}
    </div>
  );
};

const ModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={clsx('px-6 py-4', className)}>
      {children}
    </div>
  );
};

const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={clsx('px-6 py-4 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark', className)}>
      {children}
    </div>
  );
};

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
