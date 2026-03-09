'use client';

interface Column {
  key: string;
  label: string;
  format?: (value: any) => string;
}

interface PreviewTableProps {
  data: Record<string, any>[];
  columns: Column[];
  maxRows?: number;
}

export default function PreviewTable({
  data,
  columns,
  maxRows = 20,
}: PreviewTableProps) {
  const displayData = data.slice(0, maxRows);

  if (displayData.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-300">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2 text-left font-semibold text-gray-700"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, index) => (
            <tr
              key={index}
              className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              {columns.map((col) => (
                <td
                  key={`${index}-${col.key}`}
                  className="px-4 py-2 text-gray-900"
                >
                  {col.format ? col.format(row[col.key]) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
