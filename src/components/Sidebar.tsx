"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  History,
  Receipt,
  Boxes,
  PiggyBank,
  Settings,
  Store,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/dashboard/history", label: "History & Stats", icon: History },
  { href: "/dashboard/bills", label: "Monthly Bills", icon: Receipt },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes },
  { href: "/dashboard/savings", label: "Savings", icon: PiggyBank },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Sidebar({ shopName, fullName }: { shopName: string; fullName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Store size={16} color="white" />
        </div>
        <span className="font-display font-semibold text-[16px] truncate">{shopName}</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors ${
                active
                  ? "bg-primary-soft text-primary"
                  : "text-ink-soft hover:bg-background hover:text-ink"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-background transition-colors mb-1"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[11.5px] font-display font-semibold shrink-0">
            {initials(fullName || shopName || "S")}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate">{fullName || "Your account"}</p>
            <p className="text-[11px] text-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
            </p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-ink-soft hover:bg-background hover:text-danger w-full"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}