"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  CloudSun,
  Route,
  Users,
  Bell,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/compare", label: "Compare", icon: BarChart3 },
  { href: "/dashboard/forecast", label: "Forecast", icon: CloudSun },
  { href: "/dashboard/route-planner", label: "Route Planner", icon: Route },
  { href: "/dashboard/community", label: "Community", icon: Users },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

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
            {link.label}
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
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          BreatheSafe
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
