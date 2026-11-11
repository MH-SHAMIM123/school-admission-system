import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface NotificationBannerProps {
  type: 'error' | 'success' | 'info';
  message: string;
  onClose: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ type, message, onClose }) => {
  const isError = type === 'error';
  const isSuccess = type === 'success';

  return (
    <div
      className={`p-4 rounded-xl border flex items-start justify-between shadow-sm transition-all duration-300 animate-fadeIn mb-6 ${
        isError
          ? 'bg-rose-50 border-rose-200 text-rose-800'
          : isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {isError && <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />}
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />}
        {!isError && !isSuccess && <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />}
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
