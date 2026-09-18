import React from 'react';
import { useAuth } from '../../context/AuthContext.js';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              isSuccess
                ? 'bg-emerald-900/95 border-emerald-700 text-white'
                : isError
                ? 'bg-rose-900/95 border-rose-700 text-white'
                : isWarning
                ? 'bg-amber-900/95 border-amber-700 text-white'
                : 'bg-slate-900/95 border-slate-700 text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">
              {isSuccess
                ? 'check_circle'
                : isError
                ? 'error'
                : isWarning
                ? 'warning'
                : 'info'}
            </span>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold leading-tight">{toast.title}</h5>
              <p className="text-[11px] opacity-85 leading-snug mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="opacity-60 hover:opacity-100 transition-opacity p-0.5 shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
