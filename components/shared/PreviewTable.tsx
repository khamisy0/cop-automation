'use client';

interface Column {
  key: string;
  label: string;
  format?: (value: any) => string;
}

interface PreviewTableProps {
  data: Record<string, any>[];
  columns: Column[];
}

export default function PreviewTable({ data, columns }: PreviewTableProps) {
  if (data.length === 0) return null;

  return (
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
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-gray-50 transition duration-200">
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
  );
}
