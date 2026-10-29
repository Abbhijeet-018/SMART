import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger'
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertCircle className="h-6 w-6 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-600" />;
      default:
        return <HelpCircle className="h-6 w-6 text-indigo-600" />;
    }
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2 bg-slate-50 rounded-lg border border-slate-100">
          {getIcon()}
        </div>
        <div className="text-sm text-slate-600">
          <p>{message}</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 text-sm font-medium rounded-lg shadow-xs transition-colors ${getButtonClass()}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
