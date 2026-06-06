"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Package } from "lucide-react";

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const CONFIG_TABS: SubNavItem[] = [
  {
    label: "Chi Phí Vận Hành",
    href: "/configs/operational",
    icon: Cpu,
    description: "Khấu hao máy & công thợ",
  },
  {
    label: "Phụ Kiện & Bao Bì",
    href: "/configs/fixed-items",
    icon: Package,
    description: "Catalog vật tư phụ",
  },
];

export default function ConfigsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-1.5">
          <span>CẤU HÌNH GỐC</span>
        </div>
        <h1 className="text-xl md:text-2xl font-mono font-bold tracking-wider text-foreground uppercase">
          Cấu Hình Hệ Thống
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Quản lý tham số gốc ảnh hưởng đến toàn bộ bộ tính toán giá vốn của xưởng.
        </p>
      </div>

      {/* Sub-navigation tabs — scrollable on mobile */}
      <div className="overflow-x-auto pb-0.5 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {CONFIG_TABS.map((tab) => {
            const isActive = pathname?.startsWith(tab.href) ?? false;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium
                  transition-all duration-150 whitespace-nowrap group
                  ${
                    isActive
                      ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border/80"
                  }
                `}
              >
                <Icon
                  className={`h-4 w-4 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <div>
                  <span className="font-mono font-bold text-xs uppercase tracking-wide block">
                    {tab.label}
                  </span>
                  <span className="text-[10px] font-sans text-muted-foreground block leading-none mt-0.5">
                    {tab.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sub-page content */}
      <div>{children}</div>
    </div>
  );
}
