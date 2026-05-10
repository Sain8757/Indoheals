"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Package,
  History,
  Settings,
  Search,
  Box,
  ChevronRight,
  LogOut,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard Overview", href: "/", icon: LayoutDashboard },
  { name: "Order Management", href: "/orders", icon: Package },
  { name: "All Shipments", href: "/all", icon: Truck },
  { name: "Live Tracking", href: "/tracking", icon: Search },
  { name: "NDR Management", href: "/ndr", icon: AlertTriangle },
  { name: "Shipping Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 min-w-64 h-screen bg-[#131614] border-r border-white/5 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#1D9E75] flex items-center justify-center font-bold text-white">
          IH
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Indo Heals</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Logistics Control</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-4 py-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">Management</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-[#1D9E75]/10 text-[#1D9E75] font-medium"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#1D9E75] rounded-r-full" />
              )}
              <item.icon className={cn("w-4 h-4", isActive ? "text-[#1D9E75]" : "text-white/40 group-hover:text-white")} />
              <span className="text-sm">{item.name}</span>
              {isActive && <ChevronRight className="ml-auto w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Exit Logistics</span>
        </button>
      </div>
    </div>
  );
}
