"use client";

import { useState } from "react";
import { Menu, Bell, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarNav } from "@/components/layout/Sidebar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar({ unreadAlerts = 0 }: { unreadAlerts?: number }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "U";

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
        <span className="text-sm font-medium text-muted-foreground lg:hidden">BreatheSafe</span>
      </div>

      <div className="flex items-center gap-2">
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
            <DropdownMenuLabel>{session?.user?.name ?? "Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => (window.location.href = "/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
