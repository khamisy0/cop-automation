'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={`transition-all duration-300 ease-in-out ${
          collapsed ? 'ml-[68px]' : 'ml-[260px]'
        }`}
      >
        <Topbar />
        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
