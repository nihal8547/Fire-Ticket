"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Ticket, Wrench, Calendar, FileText,
  ClipboardCheck, Package, BarChart3, Settings, LogOut, Flame,
  Building2, Bell,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/customers", icon: Building2, label: "Customers", roles: ["ADMIN", "MANAGER"] },
  { href: "/tickets", icon: Ticket, label: "Tickets", roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/technicians", icon: Wrench, label: "Technicians", roles: ["ADMIN", "MANAGER"] },
  { href: "/schedule", icon: Calendar, label: "Schedule", roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/inspections", icon: ClipboardCheck, label: "Inspections", roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/assets", icon: Package, label: "Assets", roles: ["ADMIN", "MANAGER", "TECHNICIAN"] },
  { href: "/invoices", icon: FileText, label: "Invoices", roles: ["ADMIN", "MANAGER"] },
  { href: "/reports", icon: BarChart3, label: "Reports", roles: ["ADMIN", "MANAGER"] },
  { href: "/users", icon: Users, label: "Users", roles: ["ADMIN"] },
  { href: "/settings", icon: Settings, label: "Settings", roles: ["ADMIN"] },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">FireTicket</p>
          <p className="text-xs text-gray-400">Fire Protection</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-red-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-700 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm font-semibold">
            {userName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 capitalize">{userRole?.toLowerCase()}</p>
          </div>
          <Bell className="h-4 w-4 text-gray-400" />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
