import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let icon = <Info className="h-5 w-5 text-sky-500" />;
        let borderClass = 'border-sky-200 bg-white text-slate-800';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
          borderClass = 'border-emerald-200 bg-white text-slate-800';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="h-5 w-5 text-rose-500" />;
          borderClass = 'border-rose-200 bg-white text-slate-800';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
          borderClass = 'border-amber-200 bg-white text-slate-800';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all transform translate-y-0 ${borderClass}`}
          >
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">{toast.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
