'use client';

import { ClipboardCheck, Construction } from 'lucide-react';

export default function MonthlyClosingValidation() {
  return (
    <div className="max-w-7xl mx-auto p-6 animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Monthly Closing Validation</h1>
          <p className="text-gray-500 mt-1">Validate and verify monthly closing data before final submission.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="p-4 bg-teal-50 rounded-2xl mb-6">
            <Construction className="w-10 h-10 text-teal-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Under Development</h2>
          <p className="text-sm text-gray-500 max-w-md text-center leading-relaxed">
            The Monthly Closing Validation module is currently being built. This module will allow you to validate
            and verify monthly closing data to ensure accuracy before final submission.
          </p>
          <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-100 rounded-lg">
            <ClipboardCheck className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-700">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
