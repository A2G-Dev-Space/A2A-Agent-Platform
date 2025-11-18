import React from 'react';
import { clsx } from 'clsx';

export interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

export interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Body: React.FC<CardBodyProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ className, children }) => {
  return (
    <div
      className={clsx(
        'rounded-xl bg-panel-light dark:bg-panel-dark',
        'border border-border-light dark:border-gray-700',
        'shadow-sm overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-b border-border-light dark:border-border-dark',
        className
      )}
    >
      {children}
    </div>
  );
};

const CardBody: React.FC<CardBodyProps> = ({ className, children }) => {
  return (
    <div className={clsx('px-6 py-4', className)}>
      {children}
    </div>
  );
};

const CardFooter: React.FC<CardFooterProps> = ({ className, children }) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-t border-border-light dark:border-border-dark',
        'bg-background-light dark:bg-background-dark',
        className
      )}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
