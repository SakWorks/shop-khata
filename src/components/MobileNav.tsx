"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Receipt, Boxes, PiggyBank, HandCoins, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/bills", label: "Bills", icon: Receipt },
  { href: "/dashboard/inventory", label: "Stock", icon: Boxes },
  { href: "/dashboard/savings", label: "Savings", icon: PiggyBank },
  { href: "/dashboard/kameeti", label: "Kameeti", icon: HandCoins },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex overflow-x-auto z-20">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 min-w-[58px] flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium whitespace-nowrap ${
              active ? "text-primary" : "text-ink-soft"
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}