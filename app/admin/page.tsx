"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, CreditCard, Grid3X3, ArrowRight, Clock, type LucideIcon } from "lucide-react";
import StatCard, { type ColorAccent } from "@/components/ui/StatCard";

interface TableStats {
  table: string;
  count: number;
  lastUpdated: string;
  icon: LucideIcon;
  href: string;
  description: string;
  color: ColorAccent;
}

const badgeStyles: Record<ColorAccent, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
  teal: 'bg-teal-50 text-teal-600',
  gray: 'bg-gray-50 text-gray-500',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<TableStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats([
          { table: "Euro Retail Prices", count: data.euroRetailCount, lastUpdated: data.euroRetailLastUpdated, icon: CreditCard, href: "/admin/euro-retail", description: "Maps article codes to Euro retail prices", color: "blue" },
          { table: "Price Matrix", count: data.priceMatrixCount, lastUpdated: data.priceMatrixLastUpdated, icon: Grid3X3, href: "/admin/price-matrix", description: "Maps Euro retail to local retail with discount factors", color: "indigo" },
          { table: "Seasonality Reference", count: data.seasonalityCount, lastUpdated: data.seasonalityLastUpdated, icon: Database, href: "/admin/seasonality", description: "Centralized source of truth for variant expected seasons", color: "amber" },
        ]);
      } catch (err) { setError(err instanceof Error ? err.message : "An error occurred"); }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-28 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {stats.map((stat) => <StatCard key={stat.table} title={stat.table} value={stat.count.toLocaleString()} icon={stat.icon} color={stat.color} />)}
          <StatCard title="Total Records" value={stats.reduce((a, b) => a + b.count, 0).toLocaleString()} icon={Database} color="emerald" />
          <StatCard title="Active Tables" value={stats.length} icon={Database} color="purple" />
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Reference Tables</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.table} href={stat.href}>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition duration-200 group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-lg ${badgeStyles[stat.color]}`}><Icon className="w-5 h-5" /></div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{stat.table}</h3>
                  <p className="text-sm text-gray-500 mb-4">{stat.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">{stat.count.toLocaleString()} records</span>
                    <span className="flex items-center gap-1 text-sm text-gray-400"><Clock className="w-3.5 h-3.5" />{stat.lastUpdated}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Reference Tables Information</h3>
        <ul className="text-sm text-gray-600 space-y-1.5">
          <li>• <strong>Euro Retail Prices:</strong> Maps article codes (mancode) to their Euro retail prices</li>
          <li>• <strong>Price Matrix:</strong> Maps Euro retail prices to local retail prices with discount factors</li>
          <li>• Both tables are crucial for the Sale Request pricing algorithm</li>
          <li>• You can import/export data using Excel files for bulk operations</li>
        </ul>
      </div>
    </div>
  );
}
