'use client';

import Link from 'next/link';
import {
  Zap,
  ShoppingCart,
  BarChart3,
  ArrowRight,
  FileSpreadsheet,
  FolderOpen,
  TrendingUp,
  Layers,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import StatCard, { type ColorAccent } from '@/components/ui/StatCard';

export default function Dashboard() {
  const modules = [
    {
      id: 'cop',
      title: 'COP Automation',
      description: 'Transform Excel files into ERP-ready TXT format for retail price management',
      icon: Zap,
      href: '/cop',
      status: 'active' as const,
      color: 'emerald' as ColorAccent,
      features: ['Brand Manager file processing', 'RHM data merge', 'ERP TXT generation'],
    },
    {
      id: 'sale-request',
      title: 'Request for Sale Prices',
      description: 'Generate sale prices for items based on discount matrices and pricing tables',
      icon: ShoppingCart,
      href: '/sale-request',
      status: 'active' as const,
      color: 'blue' as ColorAccent,
      features: ['Excel file processing', 'Discount matrix pricing', 'Sale price generation'],
    },
    {
      id: 'seasonality',
      title: 'Seasonality Validation',
      description: 'Validate item seasons against a centralized, priority-based reference dataset',
      icon: BarChart3,
      href: '/seasonality-validation',
      status: 'active' as const,
      color: 'amber' as ColorAccent,
      features: ['Master dataset reference', 'Priority-based matching', 'Excel & Text validation'],
    },
    {
      id: 'monthly-closing',
      title: 'Monthly Closing Validation',
      description: 'Validate and verify monthly closing data to ensure accuracy before final submission',
      icon: ClipboardCheck,
      href: '/monthly-closing',
      status: 'active' as const,
      color: 'teal' as ColorAccent,
      features: ['Closing data validation', 'Discrepancy detection', 'Pre-submission checks'],
    },
    {
      id: 'lpos-automation',
      title: 'LPOs Automation',
      description: 'Automate Local Purchase Orders processing and validation',
      icon: FileText,
      href: '/lpos-automation',
      status: 'active' as const,
      color: 'rose' as ColorAccent,
      features: ['Automated LPO processing', 'Validation rules', 'Streamlined workflows'],
    },
  ];

  const badgeStyles: Record<ColorAccent, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    teal: 'bg-teal-50 text-teal-600',
    rose: 'bg-rose-50 text-rose-600',
    gray: 'bg-gray-50 text-gray-500',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Active Modules" value="5" icon={Layers} trend="Fully operational" color="indigo" />
        <StatCard title="Files Processed" value="—" icon={FileSpreadsheet} color="blue" />
        <StatCard title="COP Batches" value="—" icon={FolderOpen} color="emerald" />
        <StatCard title="Requests Processed" value="—" icon={TrendingUp} color="purple" />
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = module.status === 'active';

            return (
              <div
                key={module.id}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 transition duration-200 ${
                  isActive ? 'hover:shadow-md' : 'opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${badgeStyles[module.color]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {(module.status as string) === 'coming-soon' && (
                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-1.5">{module.title}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{module.description}</p>

                <ul className="space-y-1.5 mb-5">
                  {module.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1 h-1 bg-gray-400 rounded-full" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isActive ? (
                  <Link
                    href={module.href}
                    className="inline-flex items-center gap-2 w-full justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition duration-200"
                  >
                    Launch Module
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition duration-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">About Automation Hub</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Modular Design', text: 'Each module operates independently, allowing you to use what you need and scale as you grow.' },
            { title: 'Data Integration', text: 'All modules work together providing a unified view of retail operations and pricing strategies.' },
            { title: 'Production Ready', text: 'Built with TypeScript and best practices for reliability and maintainability at scale.' },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed pl-3.5">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
