'use client';

import { MergedRow } from '@/lib/types';

interface PreviewTableProps {
  data: MergedRow[];
  maxRows?: number;
}

export default function PreviewTable({ data, maxRows = 20 }: PreviewTableProps) {
  const displayData = data.slice(0, maxRows);

  if (displayData.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300">
            <th className="px-4 py-2 text-left font-semibold text-gray-700">Mancode</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-700">Color</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-700">Size</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-700">Season</th>
            <th className="px-4 py-2 text-right font-semibold text-gray-700">Sale Price</th>
            <th className="px-4 py-2 text-right font-semibold text-gray-700">Unit Retail</th>
            <th className="px-4 py-2 text-right font-semibold text-gray-700">Discount %</th>
            <th className="px-4 py-2 text-right font-semibold text-gray-700">New Retail</th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, index) => (
            <tr key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <td className="px-4 py-2 text-gray-900">{row.mancode}</td>
              <td className="px-4 py-2 text-gray-900">{row.color}</td>
              <td className="px-4 py-2 text-gray-900">{row.size}</td>
              <td className="px-4 py-2 text-gray-900">{row.season}</td>
              <td className="px-4 py-2 text-right text-gray-900">${row.salePrice.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-gray-900">${row.unitRetail.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-gray-900">
                {(row.discountPercent * 100).toFixed(2)}%
              </td>
              <td className="px-4 py-2 text-right font-medium text-gray-900">
                ${row.newEffectiveRetail.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > maxRows && (
        <div className="text-center py-3 text-sm text-gray-600 bg-gray-50 border-t border-gray-200">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  );
}
