import React from 'react';
import { clsx } from 'clsx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-base font-medium text-text-light-primary dark:text-text-dark-primary mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'w-full rounded-lg px-4 py-3 text-base min-h-28 resize-y',
            'bg-panel-light dark:bg-panel-dark',
            'text-text-light-primary dark:text-text-dark-primary',
            'placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary',
            'border transition-colors',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/50'
              : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/50',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
