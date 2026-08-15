"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, CloudSun, Route, Users, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Logo } from "@/components/layout/Logo";

const links = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/dashboard/compare", key: "nav.compare", icon: BarChart3 },
  { href: "/dashboard/forecast", key: "nav.forecast", icon: CloudSun },
  { href: "/dashboard/route-planner", key: "nav.routePlanner", icon: Route },
  { href: "/dashboard/community", key: "nav.community", icon: Users },
  { href: "/dashboard/alerts", key: "nav.alerts", icon: Bell },
  { href: "/dashboard/profile", key: "nav.profile", icon: User },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4" />
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card lg:block">
      <div className="flex h-16 items-center border-b px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <Logo className="h-6 w-6 text-[#22c55e]" />
          BreatheSafe
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
