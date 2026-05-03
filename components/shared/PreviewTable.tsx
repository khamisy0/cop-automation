'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  format?: (value: any) => string;
}

interface PreviewTableProps {
  data: Record<string, any>[];
  columns: Column[];
  pageSize?: number;
}

export default function PreviewTable({ data, columns, pageSize = 50 }: PreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  if (data.length === 0) return null;

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((row, rowIdx) => (
              <tr key={startIndex + rowIdx} className="hover:bg-gray-50 transition duration-200">
                {columns.map((col) => {
                  const value = row[col.key];
                  const displayValue = col.format ? col.format(value) : String(value ?? '');
                  return (
                    <td key={col.key} className="px-4 py-3 text-gray-700">{displayValue}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + pageSize, data.length)}</span> of <span className="font-medium">{data.length}</span> entries
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { 
              let page = i + 1; 
              if (totalPages > 5) { 
                if (currentPage > 3) page = currentPage - 2 + i; 
                if (currentPage > totalPages - 2) page = totalPages - 4 + i; 
              } 
              return (
                <button 
                  key={page} 
                  onClick={() => setCurrentPage(page)} 
                  className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-gray-200 text-gray-700'}`}
                >
                  {page}
                </button>
              ); 
            })}
            <button 
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages} 
              className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
