"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Ticket, Wrench, Calendar, FileText,
  ClipboardCheck, Package, BarChart3, Settings, LogOut, Flame,
  Building2, Bell, ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Dashboard",  roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/customers",   icon: Building2,       label: "Customers",  roles: ["ADMIN", "MANAGER"] },
  { href: "/tickets",     icon: Ticket,          label: "Tickets",    roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/technicians", icon: Wrench,          label: "Technicians",roles: ["ADMIN", "MANAGER"] },
  { href: "/schedule",    icon: Calendar,        label: "Schedule",   roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/inspections", icon: ClipboardCheck,  label: "Inspections",roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/assets",      icon: Package,         label: "Assets",     roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/invoices",    icon: FileText,        label: "Invoices",   roles: ["ADMIN", "MANAGER"] },
  { href: "/reports",     icon: BarChart3,       label: "Reports",    roles: ["ADMIN", "MANAGER"] },
  { href: "/users",       icon: Users,           label: "Users",      roles: ["ADMIN"] },
  { href: "/settings",    icon: Settings,        label: "Settings",   roles: ["ADMIN"] },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="flex h-full w-64 flex-col" style={{ background: "hsl(222 47% 11%)" }}>

      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b" style={{ borderColor: "hsl(222 47% 18%)" }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40">
          <Flame className="h-5 w-5 text-white drop-shadow" />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight">FireTicket</p>
          <p className="text-[11px] font-medium" style={{ color: "hsl(222 20% 55%)" }}>Fire Protection</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-hide">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-red-600 text-white shadow-sm shadow-red-900/40"
                  : "hover:bg-white/5 hover:text-white"
              )}
              style={{ color: isActive ? "#fff" : "hsl(222 20% 65%)" }}
            >
              <Icon
                className={cn("h-[18px] w-[18px] shrink-0 transition-transform duration-150",
                  !isActive && "group-hover:scale-110"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1" style={{ borderTop: "1px solid hsl(222 47% 18%)", paddingTop: "12px" }}>
        {/* User card */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-[13px] font-bold text-white shadow shadow-red-900/30">
            {userName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{userName}</p>
            <p className="text-[11px] capitalize" style={{ color: "hsl(222 20% 55%)" }}>
              {userRole?.toLowerCase()}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 transition-colors hover:bg-white/10"
            style={{ color: "hsl(222 20% 55%)" }}
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/5 hover:text-white"
          style={{ color: "hsl(222 20% 55%)" }}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
