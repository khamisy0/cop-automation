'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              AH
            </div>
            <span className="text-lg font-semibold text-gray-900">Automation Hub</span>
          </Link>
          <nav className="hidden md:flex gap-8">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition">
              Dashboard
            </Link>
            <Link href="/cop" className="text-gray-600 hover:text-gray-900 transition">
              COP Automation
            </Link>
          </nav>
          <button className="md:hidden p-2">
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
}
