"use client";

import { useEffect, useState } from "react";
import { Menu, Bell, LogOut, Globe, Moon, Sun } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useTranslation, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarNav } from "@/components/layout/Sidebar";
import { Logo } from "@/components/layout/Logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
];

export function Navbar() {
  const { data: session, update } = useSession();
  const { locale, setLocale, t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [mounted, setMounted] = useState(false);
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

  // Avoids a hydration mismatch: resolvedTheme is undefined until mounted.
  useEffect(() => setMounted(true), []);

  async function changeLocale(next: Locale) {
    setLocale(next);
    if (session) {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: next }),
      });
      await update({ language: next });
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const res = await fetch("/api/alerts?limit=1");
        const data = await res.json();
        if (!cancelled) setUnreadAlerts(data.unreadCount ?? 0);
      } catch {
        // ignore  bell just won't show a count this cycle
      }
    }
    loadUnread();
    const interval = setInterval(loadUnread, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle>BreatheSafe</SheetTitle>
            </SheetHeader>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground lg:hidden">
          <Logo className="h-5 w-5 text-[#22c55e]" />
          BreatheSafe
        </span>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <Globe className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LOCALES.map((l) => (
              <DropdownMenuItem
                key={l.value}
                onClick={() => changeLocale(l.value)}
                className={locale === l.value ? "font-medium text-primary" : ""}
              >
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <a href="/dashboard/alerts" className="relative">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          {unreadAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadAlerts > 9 ? "9+" : unreadAlerts}
            </span>
          )}
        </a>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{session?.user?.name ?? "Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => (window.location.href = "/dashboard/profile")}>
                {t("nav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="mr-2 h-4 w-4" />
                {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
