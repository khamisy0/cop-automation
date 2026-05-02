'use client';

import { type LucideIcon } from 'lucide-react';

export type ColorAccent = 'indigo' | 'blue' | 'emerald' | 'amber' | 'purple' | 'teal' | 'gray';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: ColorAccent;
}

export default function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'gray' }: StatCardProps) {
  const colorStyles: Record<ColorAccent, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50 text-teal-600',
    gray: 'bg-gray-50 text-gray-500',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trendUp ? 'text-emerald-600' : 'text-gray-500'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorStyles[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
