'use client';

import { AlertCircle, X } from 'lucide-react';

interface ErrorDialogProps {
  error: string | null;
  details?: string;
  fix?: string;
  onClose: () => void;
}

export function ErrorDialog({ error, details, fix, onClose }: ErrorDialogProps) {
  if (!error) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              {error}
            </h3>
            {details && (
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {details}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {fix && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              How to fix:
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {fix}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
