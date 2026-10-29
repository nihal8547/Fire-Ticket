"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Ticket, Wrench, Calendar, FileText,
  ClipboardCheck, Package, BarChart3, Settings, LogOut, Flame,
  Building2, Bell, ChevronRight, Menu, X, Plus,
} from "lucide-react";

export const navItems = [
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

const bottomBarItems = [
  { href: "/dashboard",   icon: LayoutDashboard, label: "Home" },
  { href: "/tickets",     icon: Ticket,          label: "Tickets" },
  { href: "/schedule",    icon: Calendar,        label: "Schedule" },
  { href: "/inspections", icon: ClipboardCheck,  label: "Inspect" },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter items based on user role
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  // Automatically close mobile menu when navigating to a new page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* ── 1. Desktop Fixed Sidebar (md and up) ─────────────────────────── */}
      <aside
        className="hidden md:flex h-full w-64 flex-col shrink-0 z-30 select-none"
        style={{ background: "hsl(222 47% 11%)" }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center gap-3 px-5 border-b"
          style={{ borderColor: "hsl(222 47% 18%)" }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/40">
            <Flame className="h-5 w-5 text-white drop-shadow" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">FireTicket</p>
            <p className="text-[11px] font-medium" style={{ color: "hsl(222 20% 55%)" }}>
              Fire Protection
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-hide">
          {visibleItems.map((item) => {
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
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform duration-150",
                    !isActive && "group-hover:scale-110"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-3 pb-4 space-y-1"
          style={{ borderTop: "1px solid hsl(222 47% 18%)", paddingTop: "12px" }}
        >
          {/* User card */}
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-[13px] font-bold text-white shadow shadow-red-900/30">
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {userName}
              </p>
              <p className="text-[11px] capitalize" style={{ color: "hsl(222 20% 55%)" }}>
                {userRole?.toLowerCase()}
              </p>
            </div>
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

      {/* ── 2. Mobile Top Header Bar (< md) ─────────────────────────────────── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-3 border-b shadow-xs select-none"
        style={{
          background: "hsl(222 47% 11%)",
          borderColor: "hsl(222 47% 18%)",
        }}
      >
        <div className="flex items-center gap-2">
          {/* Hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile brand */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-sm shadow-red-900/40">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm text-white tracking-tight">FireTicket</span>
          </Link>
        </div>

        {/* Right quick actions */}
        <div className="flex items-center gap-1.5">
          <Link href="/tickets/new">
            <button
              type="button"
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xs active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ticket</span>
            </button>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-xs font-bold text-white shadow-xs ml-1"
          >
            {userName?.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ── 3. Mobile Slide-Over Drawer & Backdrop Overlay (< md) ───────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div
            className="relative flex w-72 max-w-[82vw] flex-col h-full shadow-2xl z-10 transition-transform duration-250 ease-out"
            style={{ background: "hsl(222 47% 11%)" }}
          >
            {/* Drawer Header */}
            <div
              className="flex h-14 items-center justify-between px-4 border-b"
              style={{ borderColor: "hsl(222 47% 18%)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-sm">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white tracking-tight">FireTicket</p>
                  <p className="text-[10px]" style={{ color: "hsl(222 20% 55%)" }}>Operations System</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close Navigation Menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-red-600 text-white font-semibold shadow-xs"
                        : "hover:bg-white/5 text-gray-300"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer User Card & Sign Out */}
            <div
              className="px-3 py-3 border-t space-y-2 bg-black/20"
              style={{ borderColor: "hsl(222 47% 18%)" }}
            >
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-xs font-bold text-white">
                  {userName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{userName}</p>
                  <p className="text-[11px] capitalize text-gray-400">{userRole?.toLowerCase()}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-300 hover:text-white hover:bg-red-950/40 transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Mobile Bottom Quick App Bar (< md) ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-40 flex items-center justify-around px-1 border-t shadow-lg safe-bottom select-none"
        style={{
          background: "hsl(222 47% 11% / 0.96)",
          backdropFilter: "blur(12px)",
          borderColor: "hsl(222 47% 18%)",
        }}
      >
        {bottomBarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-red-500 font-semibold"
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                  isActive && "bg-red-500/15"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-red-500" : "text-gray-400")} />
              </div>
              <span className="mt-0.5 leading-none">{item.label}</span>
            </Link>
          );
        })}

        {/* More / Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1.5 text-[11px] font-medium transition-colors",
            mobileMenuOpen ? "text-red-500 font-semibold" : "text-gray-400 hover:text-gray-200"
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg">
            <Menu className="h-4 w-4" />
          </div>
          <span className="mt-0.5 leading-none">More</span>
        </button>
      </nav>
    </>
  );
}
