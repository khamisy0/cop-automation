'use client';

import { ProcessingError } from '@/lib/types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ErrorAlertProps {
  errors: ProcessingError[];
  title?: string;
  showCount?: boolean;
}

export default function ErrorAlert({ errors, title = 'Processing Errors', showCount = true }: ErrorAlertProps) {
  if (errors.length === 0) return null;

  const hasWarnings = errors.some((e) => e.type === 'merge');
  const isError = !hasWarnings || errors.some((e) => e.type !== 'merge');

  return (
    <div
      className={`rounded-lg p-4 ${
        isError ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
      }`}
    >
      <div className="flex items-start">
        {isError ? (
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
        )}
        <div className="flex-1">
          <h3
            className={`font-medium ${isError ? 'text-red-900' : 'text-yellow-900'}`}
          >
            {title}
            {showCount && ` (${errors.length})`}
          </h3>
          <ul className={`mt-2 list-disc list-inside space-y-1 text-sm ${isError ? 'text-red-800' : 'text-yellow-800'}`}>
            {errors.slice(0, 10).map((error, index) => (
              <li key={index}>
                <span className="font-medium">[{error.type}]</span> {error.message}
              </li>
            ))}
            {errors.length > 10 && <li className="font-medium">... and {errors.length - 10} more errors</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
