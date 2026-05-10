"use client";

import { useState } from "react";
import { 
  Search, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Package, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrackingPage() {
  const [awb, setAwb] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!awb) return;
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setResult({
        id: awb,
        status: "In Transit",
        estimatedDelivery: "May 12, 2026",
        currentLocation: "New Delhi Hub, Okhla",
        courier: "Delhivery (Express)",
        timeline: [
          { time: "May 10, 10:45 AM", location: "New Delhi Hub", activity: "Shipment reached the regional sorting center", status: "completed" },
          { time: "May 09, 04:30 PM", location: "Mumbai Warehouse", activity: "Shipment picked up by courier partner", status: "completed" },
          { time: "May 09, 11:20 AM", location: "Indo Heals Facility", activity: "Manifest generated \u0026 Shipment packed", status: "completed" },
          { time: "May 10, 02:00 PM", location: "Upcoming", activity: "Out for Delivery", status: "pending" },
        ]
      });
      setIsSearching(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-1000">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-[#1D9E75] text-[10px] font-bold uppercase tracking-widest">
          <Navigation className="w-3 h-3" />
          Real-time Logistics
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Track Your Shipments</h1>
        <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
          Get real-time updates from over 20+ courier partners integrated via Shiprocket API.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto group">
        <form onSubmit={handleSearch} className="relative z-10">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Truck className="w-5 h-5 text-white/20 group-focus-within:text-[#1D9E75] transition-colors" />
          </div>
          <input 
            type="text" 
            className="block w-full bg-[#131614] border border-white/10 rounded-[2rem] py-5 pl-14 pr-32 text-lg text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]/40 transition-all shadow-2xl shadow-black/50"
            placeholder="Enter AWB or Shipment ID..."
            value={awb}
            onChange={(e) => setAwb(e.target.value)}
          />
          <button 
            type="submit" 
            className="absolute right-3 top-2.5 bottom-2.5 bg-[#1D9E75] hover:bg-[#189060] text-white px-6 rounded-[1.5rem] font-bold text-sm transition-all shadow-lg shadow-[#1D9E75]/20 flex items-center gap-2"
            disabled={isSearching}
          >
            {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            Track Now
          </button>
        </form>
        <div className="absolute inset-0 bg-[#1D9E75]/10 blur-3xl rounded-[2rem] -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity" />
      </div>

      {result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#131614] border border-white/5 p-6 rounded-3xl space-y-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Current Status</p>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#1D9E75]" />
                <h3 className="text-xl font-bold text-white">{result.status}</h3>
              </div>
            </div>
            <div className="bg-[#131614] border border-white/5 p-6 rounded-3xl space-y-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Est. Delivery</p>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-bold text-white">{result.estimatedDelivery}</h3>
              </div>
            </div>
            <div className="bg-[#131614] border border-white/5 p-6 rounded-3xl space-y-2">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Courier Partner</p>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-bold text-white">{result.courier}</h3>
              </div>
            </div>
          </div>

          <div className="bg-[#131614] border border-white/5 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
              <Package className="w-32 h-32 text-white/[0.02] -rotate-12" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75]/10 flex items-center justify-center border border-[#1D9E75]/20">
                <MapPin className="w-4 h-4 text-[#1D9E75]" />
              </div>
              Journey Timeline
            </h3>

            <div className="space-y-12 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
              {result.timeline.map((item, idx) => (
                <div key={idx} className="relative pl-12 flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  <div className={cn(
                    "absolute left-2 top-1.5 w-4 h-4 rounded-full border-4 border-[#131614] shadow-xl z-10 transition-transform duration-500 group-hover:scale-125",
                    item.status === 'completed' ? "bg-[#1D9E75] shadow-[#1D9E75]/20" : "bg-white/10"
                  )} />
                  <div className="flex-1">
                    <p className={cn("text-base font-bold transition-colors", item.status === 'completed' ? "text-white" : "text-white/20")}>
                      {item.activity}
                    </p>
                    <p className="text-sm text-white/40 mt-1 flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </p>
                  </div>
                  <div className="text-left md:text-right shrink-0">
                    <p className={cn("text-sm font-bold", item.status === 'completed' ? "text-[#1D9E75]" : "text-white/10")}>
                      {item.time}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">Activity Logged</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
