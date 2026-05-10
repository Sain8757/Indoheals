"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  MapPin, 
  Package, 
  CreditCard, 
  Truck, 
  CheckCircle2, 
  Clock, 
  CircleDashed,
  ExternalLink,
  Printer
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const timelineEvents = [
  { status: "Confirmed", time: "May 08, 10:00 AM", completed: true, icon: CheckCircle2 },
  { status: "Packed", time: "May 08, 02:30 PM", completed: true, icon: Package },
  { status: "Picked Up", time: "May 09, 11:15 AM", completed: true, icon: Truck },
  { status: "In Transit", time: "May 10, 08:45 AM", completed: true, icon: MapPin },
  { status: "Out For Delivery", time: "Pending", completed: false, icon: CircleDashed },
  { status: "Delivered", time: "Pending", completed: false, icon: CircleDashed },
];

export function ShipmentDrawer({ isOpen, onClose, data }) {
  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#131614] border-l border-white/10 z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 className="text-lg font-bold text-white">Shipment {data.id}</h2>
                <p className="text-xs text-[#1D9E75] font-mono mt-1">{data.awb}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              
              {/* Customer Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Customer Details</h3>
                <div className="bg-[#0d0f0e] border border-white/5 rounded-2xl p-5 space-y-3">
                  <p className="font-bold text-white text-sm">{data.customer}</p>
                  <p className="text-xs text-white/60">{data.phone}</p>
                  <div className="flex items-start gap-2 pt-3 border-t border-white/5 mt-3">
                    <MapPin className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                    <p className="text-xs text-white/60 leading-relaxed">
                      123, Sample Street Name, Sector 4, New Delhi, 110025, India
                    </p>
                  </div>
                </div>
              </div>

              {/* Package Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Package & Payment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0d0f0e] border border-white/5 rounded-2xl p-4">
                    <Package className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-xs text-white/40 mb-1">Weight</p>
                    <p className="text-sm font-bold text-white">1.2 kg</p>
                  </div>
                  <div className="bg-[#0d0f0e] border border-white/5 rounded-2xl p-4">
                    <CreditCard className="w-4 h-4 text-amber-400 mb-2" />
                    <p className="text-xs text-white/40 mb-1">Payment</p>
                    <p className="text-sm font-bold text-white">{data.payment} • {formatCurrency(data.amount)}</p>
                  </div>
                </div>
              </div>

              {/* Tracking Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
                  Journey Timeline
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">{data.courier}</span>
                </h3>
                <div className="bg-[#0d0f0e] border border-white/5 rounded-2xl p-6 relative">
                  <div className="absolute left-9 top-10 bottom-10 w-0.5 bg-white/5" />
                  <div className="space-y-6">
                    {timelineEvents.map((event, idx) => {
                      const Icon = event.icon;
                      return (
                        <div key={idx} className="relative flex items-center gap-4 group">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 z-10 transition-colors",
                            event.completed 
                              ? "bg-[#1D9E75] border-[#131614] text-white shadow-lg shadow-[#1D9E75]/30" 
                              : "bg-[#131614] border-white/10 text-white/20"
                          )}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold", event.completed ? "text-white" : "text-white/40")}>
                              {event.status}
                            </p>
                            <p className="text-[10px] text-white/40 mt-0.5">{event.time}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-white/5 bg-[#0d0f0e] grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs transition-all border border-white/10">
                <Printer className="w-4 h-4" />
                Print Label
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9E75] hover:bg-[#189060] text-white font-bold text-xs transition-all shadow-lg shadow-[#1D9E75]/20">
                <ExternalLink className="w-4 h-4" />
                Live Tracking
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
