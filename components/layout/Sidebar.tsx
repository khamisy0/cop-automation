'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Tag,
  FileSpreadsheet,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
  CreditCard,
  Grid3X3,
  CalendarRange,
  ClipboardCheck,
  FileText,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeText: string;
  activeIcon: string;
  hoverBg: string;
  hoverText: string;
  children?: { href: string; label: string; icon: React.ElementType }[];
}

const navItems: NavItem[] = [
  { 
    href: '/', label: 'Dashboard', icon: LayoutDashboard, 
    color: 'text-indigo-500', activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', 
    activeIcon: 'text-indigo-600', hoverBg: 'hover:bg-indigo-50', hoverText: 'hover:text-indigo-700' 
  },
  { 
    href: '/sale-request', label: 'Request For Sale Prices', icon: Tag, 
    color: 'text-blue-500', activeBg: 'bg-blue-50', activeText: 'text-blue-700', 
    activeIcon: 'text-blue-600', hoverBg: 'hover:bg-blue-50', hoverText: 'hover:text-blue-700' 
  },
  { 
    href: '/cop', label: 'COP Automation', icon: FileSpreadsheet, 
    color: 'text-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', 
    activeIcon: 'text-emerald-600', hoverBg: 'hover:bg-emerald-50', hoverText: 'hover:text-emerald-700' 
  },
  { 
    href: '/seasonality-validation', label: 'Seasonality Validation', icon: CalendarRange, 
    color: 'text-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', 
    activeIcon: 'text-amber-600', hoverBg: 'hover:bg-amber-50', hoverText: 'hover:text-amber-700' 
  },
  { 
    href: '/monthly-closing', label: 'Monthly Closing Validation', icon: ClipboardCheck, 
    color: 'text-teal-500', activeBg: 'bg-teal-50', activeText: 'text-teal-700', 
    activeIcon: 'text-teal-600', hoverBg: 'hover:bg-teal-50', hoverText: 'hover:text-teal-700' 
  },
  { 
    href: '/lpos-automation', label: 'LPOs Automation', icon: FileText, 
    color: 'text-rose-500', activeBg: 'bg-rose-50', activeText: 'text-rose-700', 
    activeIcon: 'text-rose-600', hoverBg: 'hover:bg-rose-50', hoverText: 'hover:text-rose-700' 
  },
  {
    href: '/admin',
    label: 'Reference Databases',
    icon: Database,
    color: 'text-purple-500', activeBg: 'bg-purple-50', activeText: 'text-purple-700', 
    activeIcon: 'text-purple-600', hoverBg: 'hover:bg-purple-50', hoverText: 'hover:text-purple-700',
    children: [
      { href: '/admin/euro-retail', label: 'Euro Retail', icon: CreditCard },
      { href: '/admin/price-matrix', label: 'Price Matrix', icon: Grid3X3 },
      { href: '/admin/seasonality', label: 'Seasonality Master', icon: CalendarRange },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '#') return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some((child) => isActive(child.href)) ?? false;
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-50 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-gray-900 font-semibold text-sm whitespace-nowrap">
              Automation Hub
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isParentActive(item);

            return (
              <div key={item.label}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition duration-200 ease-in-out ${
                    active
                      ? `${item.activeBg} ${item.activeText}`
                      : `text-gray-600 ${item.hoverBg} ${item.hoverText}`
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] flex-shrink-0 ${
                      active ? item.activeIcon : item.color
                    }`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>

                {/* Sub-items */}
                {!collapsed && item.children && active && (
                  <div className="ml-[30px] mt-1 space-y-1 animate-fade-in">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isActive(child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition duration-200 ease-in-out ${
                            childActive
                              ? item.activeText + ' font-medium ' + item.activeBg
                              : `text-gray-500 ${item.hoverText} ${item.hoverBg}`
                          }`}
                        >
                          <ChildIcon className={`w-4 h-4 flex-shrink-0 ${childActive ? item.activeIcon : 'text-gray-400'}`} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 border-t border-gray-200 pt-3">
        <Link
          href="#"
          title={collapsed ? 'Settings' : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition duration-200"
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0 text-gray-500" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          onClick={onToggle}
          className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition duration-200 text-sm"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
