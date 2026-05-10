"use client";

import { useState } from "react";
import { 
  AlertTriangle,
  PhoneCall,
  RefreshCcw,
  MapPin,
  MessageSquare,
  Ban,
  CheckCircle2,
  Clock,
  UserX
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_NDR = [
  { id: "AWB94821", order: "ORD-94821", customer: "Amit Sharma", phone: "+91 9876543210", reason: "Customer Unavailable", attempts: 2, courier: "Delhivery", date: "May 10, 2026" },
  { id: "AWB94822", order: "ORD-94822", customer: "Priya Singh", phone: "+91 9876543211", reason: "Address Incomplete", attempts: 1, courier: "Blue Dart", date: "May 10, 2026" },
  { id: "AWB94823", order: "ORD-94823", customer: "Rahul Verma", phone: "+91 9876543212", reason: "Customer Refused", attempts: 3, courier: "Ecom Express", date: "May 09, 2026" },
];

export default function NDRManagementPage() {
  const [data, setData] = useState(MOCK_NDR);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">NDR Management</h1>
          </div>
          <p className="text-white/40 text-sm">Non-Delivery Reports. Resolve failed delivery attempts quickly to prevent RTO.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[#131614] border border-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Pending NDR</span>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">{data.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item) => (
          <div key={item.id} className="bg-[#131614] border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-all flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/50 to-transparent" />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{item.order}</span>
                <h3 className="text-sm font-bold text-white mt-1">{item.id}</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                Attempt {item.attempts}/3
              </span>
            </div>

            <div className="space-y-4 mb-6 flex-1">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <UserX className="w-4 h-4 text-white/60" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Failure Reason</p>
                  <p className="text-sm text-red-400 font-semibold">{item.reason}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-white/60" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Last Attempt</p>
                  <p className="text-sm text-white/80 font-medium">{item.date}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-sm font-bold text-white">{item.customer}</p>
                <p className="text-xs text-white/40">{item.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <button className="flex items-center justify-center gap-2 bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 text-[#1D9E75] py-2.5 rounded-xl text-xs font-bold transition-all border border-[#1D9E75]/20">
                <RefreshCcw className="w-3 h-3" />
                Reattempt
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10">
                <PhoneCall className="w-3 h-3" />
                Call Buyer
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10">
                <MapPin className="w-3 h-3" />
                Edit Address
              </button>
              <button className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-xl text-xs font-bold transition-all border border-red-500/20">
                <Ban className="w-3 h-3" />
                Return (RTO)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
