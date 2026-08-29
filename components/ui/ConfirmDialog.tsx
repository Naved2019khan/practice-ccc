'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive' | 'warning';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  children,
}) => {
  if (!isOpen) return null;

  const iconMap = {
    default: <CheckCircle2 className="w-5 h-5 text-ember-primary" />,
    destructive: <AlertTriangle className="w-5 h-5 text-red-500" />,
    warning: <Info className="w-5 h-5 text-amber-500" />,
  };

  const confirmVariantMap: Record<string, any> = {
    default: 'primary',
    destructive: 'destructive',
    warning: 'primary',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-0"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-ember-surface border border-ember-border rounded-card shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-ember-border bg-ember-bg/50">
          <div className="flex items-center gap-3">
            {iconMap[variant]}
            <div>
              <h3 className="text-sm font-bold text-ember-text-primary font-display">{title}</h3>
              {description && (
                <p className="text-xs text-ember-text-secondary mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-btn text-ember-neutral hover:text-ember-text-primary hover:bg-ember-surface-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {children}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-ember-bg/50 border-t border-ember-border">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariantMap[variant]}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
