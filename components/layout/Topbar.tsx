'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell, User } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/cop': 'COP Automation',
  '/sale-request': 'Request for Sale Prices',
  '/admin': 'Data Management',
  '/admin/euro-retail': 'Euro Retail Prices',
  '/admin/price-matrix': 'Price Matrix',
};

export default function Topbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Automation Hub';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left — Page title */}
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      {/* Right — Search, Notifications, Avatar */}
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-gray-300 border border-transparent transition duration-200"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition duration-200">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500" />
          </div>
          <div className="hidden xl:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">Admin</p>
            <p className="text-xs text-gray-500 leading-tight">admin@hub.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}
