'use client';

import { AlertCircle } from 'lucide-react';

interface ProcessingError {
  type: string;
  message: string;
}

interface ErrorAlertProps {
  errors: ProcessingError[];
  title?: string;
}

export default function ErrorAlert({ errors, title = 'Errors' }: ErrorAlertProps) {
  if (errors.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
        <h4 className="text-sm font-medium text-red-800">{title}</h4>
      </div>
      <ul className="space-y-1 ml-6">
        {errors.map((error, idx) => (
          <li key={idx} className="text-sm text-red-700">{error.message}</li>
        ))}
      </ul>
    </div>
  );
}
