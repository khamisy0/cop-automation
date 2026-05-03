'use client';

import { FileText, Construction } from 'lucide-react';

export default function LPOsAutomation() {
  return (
    <div className="max-w-7xl mx-auto p-6 animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">LPOs Automation</h1>
          <p className="text-gray-500 mt-1">Automate Local Purchase Orders processing and validation.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="p-4 bg-rose-50 rounded-2xl mb-6">
            <Construction className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Under Development</h2>
          <p className="text-sm text-gray-500 max-w-md text-center leading-relaxed">
            The LPOs Automation module is currently being built. This module will allow you to automate 
            Local Purchase Orders processing, apply validation rules, and streamline your workflows.
          </p>
          <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-lg">
            <FileText className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-medium text-rose-700">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
