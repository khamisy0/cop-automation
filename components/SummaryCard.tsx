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
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      value: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      value: 'text-green-600',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      value: 'text-red-600',
    },
    slate: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-900',
      value: 'text-slate-600',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      value: 'text-yellow-600',
    },
  };

  const style = colorStyles[color];
  
  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4`}>
      <div className={`text-sm font-medium ${style.text} mb-1`}>{title}</div>
      <div className={`text-2xl font-bold ${style.value}`}>{value}</div>
    </div>
  );
}
