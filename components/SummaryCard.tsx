'use client';

interface SummaryCardProps {
  totalSKUs: number;
  averageDiscount: number;
  missingItemsCount: number;
}

export default function SummaryCard({
  totalSKUs,
  averageDiscount,
  missingItemsCount,
}: SummaryCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm font-medium text-blue-900 mb-1">Total SKUs Processed</div>
        <div className="text-3xl font-bold text-blue-600">{totalSKUs.toLocaleString()}</div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="text-sm font-medium text-green-900 mb-1">Average Discount</div>
        <div className="text-3xl font-bold text-green-600">{(averageDiscount * 100).toFixed(2)}%</div>
      </div>

      <div className={`border rounded-lg p-4 ${missingItemsCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`text-sm font-medium mb-1 ${missingItemsCount > 0 ? 'text-yellow-900' : 'text-gray-900'}`}>
          Missing/Skipped Items
        </div>
        <div className={`text-3xl font-bold ${missingItemsCount > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
          {missingItemsCount}
        </div>
      </div>
    </div>
  );
}
