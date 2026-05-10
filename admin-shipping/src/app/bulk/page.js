"use client";

import { useState } from "react";
import { 
  Package, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Layers,
  ChevronDown,
  Printer
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function BulkActionsPage() {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const mockOrders = [
    { id: "ORD-94821", customer: "Amit Sharma", items: 2, total: 2499, status: "paid" },
    { id: "ORD-94822", customer: "Sneha Reddy", items: 1, total: 1249, status: "paid" },
    { id: "ORD-94823", customer: "Vikram Singh", items: 3, total: 4599, status: "paid" },
    { id: "ORD-94824", customer: "Pooja Gupta", items: 1, total: 899, status: "paid" },
  ];

  const toggleSelect = (id) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center border border-[#1D9E75]/20">
            <Layers className="w-6 h-6 text-[#1D9E75]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bulk Fulfillment</h1>
            <p className="text-white/40 text-sm">Select multiple orders to create shipments and print labels in one go.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-white/30 uppercase tracking-widest">{selectedOrders.length} Orders Selected</span>
          <button 
            className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] disabled:opacity-30 disabled:grayscale text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-[#1D9E75]/20"
            disabled={selectedOrders.length === 0 || isProcessing}
            onClick={() => setIsProcessing(true)}
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Shipments
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#131614] border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#1D9E75]" />
                Unfulfilled Orders
              </h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Select All</button>
            </div>
            <div className="divide-y divide-white/5">
              {mockOrders.map((order) => (
                <div 
                  key={order.id} 
                  className={cn(
                    "p-5 flex items-center justify-between group transition-all cursor-pointer",
                    selectedOrders.includes(order.id) ? "bg-[#1D9E75]/5" : "hover:bg-white/[0.01]"
                  )}
                  onClick={() => toggleSelect(order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                      selectedOrders.includes(order.id) ? "bg-[#1D9E75] border-[#1D9E75]" : "border-white/10"
                    )}>
                      {selectedOrders.includes(order.id) && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{order.id}</p>
                      <p className="text-[11px] text-white/40 font-medium">{order.customer} \u2022 {order.items} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{formatCurrency(order.total)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1D9E75]">Ready to ship</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#131614] border border-white/5 rounded-3xl p-6 space-y-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Processing Steps
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1D9E75]/20 flex items-center justify-center border border-[#1D9E75]/30 shrink-0">
                  <span className="text-[11px] font-bold text-[#1D9E75]">01</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Create Shipments</p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">System will automatically push selected orders to Shiprocket.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  <span className="text-[11px] font-bold text-white/30">02</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white/40">Assign Courier \u0026 AWB</p>
                  <p className="text-xs text-white/20 mt-1 leading-relaxed">Automatically assigns the cheapest/fastest courier for each order.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  <span className="text-[11px] font-bold text-white/30">03</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white/40">Generate Labels</p>
                  <p className="text-xs text-white/20 mt-1 leading-relaxed">Download a combined PDF with all shipping labels.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-400/80 leading-relaxed font-medium">
                  Ensure you have enough Shiprocket credits before proceeding with bulk fulfillment.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-3xl p-6 flex items-center justify-between group cursor-pointer hover:bg-[#1D9E75]/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#1D9E75] flex items-center justify-center shadow-lg shadow-[#1D9E75]/30">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Print Invoices</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-0.5">Bulk Export (PDF)</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 group-hover:translate-x-1 group-hover:text-white transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}
