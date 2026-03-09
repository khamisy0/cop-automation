'use client';

interface SummaryCardProps {
  title: string;
  value: string | number;
  color?: 'blue' | 'green' | 'red' | 'slate' | 'yellow';
}

export default function SummaryCard({
  title,
  value,
  color = 'blue',
}: SummaryCardProps) {
  const colorStyles = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', value: 'text-blue-600' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', value: 'text-emerald-600' },
    red: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', value: 'text-rose-600' },
    slate: { bg: 'bg-background', border: 'border-border', text: 'text-text-secondary', value: 'text-text-muted' },
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', value: 'text-amber-600' },
  };

  const style = colorStyles[color];

  return (
    <div className={`${style.bg} border ${style.border} rounded-2xl p-5`}>
      <div className={`text-sm font-medium ${style.text} mb-1`}>{title}</div>
      <div className={`text-2xl font-bold ${style.value}`}>{value}</div>
    </div>
  );
}
