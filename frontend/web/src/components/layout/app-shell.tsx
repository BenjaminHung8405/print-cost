'use client';

import { BarChart3, Layers, Package, Plus, Settings, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { ThemeToggle } from '../theme-toggle';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: 'Thống kê', href: '/analytics', icon: BarChart3 },
    { label: 'Đơn hàng', href: '/orders', icon: ShoppingCart },
    { label: 'Sản phẩm', href: '/products', icon: Package },
    { label: 'Vật liệu', href: '/materials', icon: Layers },
    { label: 'Cấu hình', href: '/configs', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* =========================================================================
          DESKTOP SIDEBAR (w-64)
          ========================================================================= */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border sticky top-0 h-screen select-none z-30">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between">
          <Link href="/analytics" className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-mono font-bold text-white shadow-lg shadow-emerald-900/40">
              P
              <div className="absolute inset-0.5 rounded border border-white/20 pointer-events-none" />
            </div>
            <span className="font-mono font-bold text-lg tracking-wider text-foreground">
              PrintCost
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname ? pathname.startsWith(item.href) : false;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 rounded-r bg-primary top-1/2 -translate-y-1/2" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Action - Create Order (Desktop Sidebar Bottom) */}
        <div className="p-4 border-t border-border bg-muted/20">
          <Link
            href="/orders/create"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 transition-all duration-150 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Tạo đơn mới</span>
          </Link>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE TOP HEADER
          ========================================================================= */}
      <header className="lg:hidden h-14 bg-card border-b border-border sticky top-0 flex items-center justify-between px-4 z-30 select-none">
        <Link href="/analytics" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center font-mono font-bold text-white text-sm shadow-md">
            P
          </div>
          <span className="font-mono font-bold text-base tracking-wider">PrintCost</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* =========================================================================
          MAIN CONTENT CONTAINER
          ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (with Floating Emerald Action Button)
          ========================================================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/85 backdrop-blur-md border-t border-border px-4 py-2 flex items-center justify-between z-30 select-none safe-bottom">
        {/* Navigation Items (Left Side) */}
        <div className="flex flex-1 justify-around max-w-[42%]">
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname ? pathname.startsWith(item.href) : false;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Center - Floating Action Button (FAB) */}
        <div className="relative -top-5 flex flex-col items-center">
          <Link
            href="/orders/create"
            className="w-14 h-14 rounded-full bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-900/60 hover:scale-105 active:scale-95 transition-all duration-150 border-4 border-background"
            aria-label="Tạo đơn hàng mới"
          >
            <Plus className="w-6 h-6 stroke-[3px]" />
          </Link>
          <span className="text-[10px] font-bold text-emerald-500 mt-1">Tạo Đơn</span>
        </div>

        {/* Navigation Items (Right Side) */}
        <div className="flex flex-1 justify-around max-w-[48%]">
          {navItems.slice(2, 5).map((item) => {
            const isActive = pathname ? pathname.startsWith(item.href) : false;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
