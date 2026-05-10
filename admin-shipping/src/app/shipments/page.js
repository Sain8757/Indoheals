"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  MoreVertical,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText
} from "lucide-react";
import { cn, formatDate, formatCurrency } from "@/lib/utils";

const tabs = ["All", "Pending", "Shipped", "Delivered", "Cancelled", "RTO"];

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Shipment Management</h1>
          <p className="text-white/40 text-sm mt-1">Manage and track all your ecommerce shipments in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 px-4 py-2 rounded-xl text-sm transition-all">
            <Printer className="w-4 h-4" />
            Bulk Print
          </button>
          <button className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[#131614] border border-white/5 rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-[#0d0f0e] p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                  activeTab === tab 
                    ? "bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/20" 
                    : "text-white/40 hover:text-white"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text" 
                placeholder="Search by ID or Customer..." 
                className="bg-[#0d0f0e] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 w-full md:w-64 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="p-2.5 bg-[#0d0f0e] border border-white/5 rounded-xl text-white/40 hover:text-white transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01] text-[10px] uppercase tracking-widest text-white/30 font-bold border-b border-white/5">
                <th className="px-6 py-4 w-8"><input type="checkbox" className="accent-[#1D9E75]" /></th>
                <th className="px-6 py-4">Shipment Details</th>
                <th className="px-6 py-4">Customer \u0026 Destination</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <tr key={i} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-6 py-4"><input type="checkbox" className="accent-[#1D9E75]" /></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs text-[#1D9E75] font-bold">#SR-9482{i}</span>
                      <span className="text-[10px] text-white/30 flex items-center gap-1 font-bold">
                        <RefreshCw className="w-2.5 h-2.5" />
                        ORDER #IND-82{i}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white/90 font-semibold text-xs uppercase tracking-tight">Rajesh Kumar {i}</span>
                      <span className="text-[11px] text-white/40 truncate max-w-[200px]">New Delhi, 110025, India</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm", 
                          i % 3 === 0 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : 
                          i % 4 === 0 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-blue-500/10 text-blue-400 border border-blue-500/20")}>
                          {i % 3 === 0 ? "Pick-up Scheduled" : i % 4 === 0 ? "RTO Initiated" : "In Transit"}
                        </span>
                      </div>
                      <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1D9E75] transition-all duration-1000" style={{ width: `${i * 10}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white font-bold">{formatCurrency(1249 + i * 100)}</span>
                      <span className="text-[10px] text-white/20 font-bold uppercase">Prepaid</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-[#1D9E75] transition-all group/btn" title="Label">
                        <FileText className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all" title="Track">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-xs text-white/30 font-medium">Showing <span className="text-white/60">1-10</span> of <span className="text-white/60">482</span> shipments</p>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-white/5 rounded-xl text-white/20 hover:text-white transition-all disabled:opacity-30" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              {[1, 2, 3].map(p => (
                <button key={p} className={cn("w-8 h-8 rounded-xl text-xs font-bold transition-all", p === 1 ? "bg-[#1D9E75] text-white" : "text-white/40 hover:bg-white/5 hover:text-white")}>
                  {p}
                </button>
              ))}
            </div>
            <button className="p-2 border border-white/5 rounded-xl text-white/20 hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
