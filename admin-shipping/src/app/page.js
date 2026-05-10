"use client";

import {
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { CreateShipmentModal } from "@/components/CreateShipmentModal";
import { useState } from "react";

const stats = [
  { name: "Total Shipments", value: "1,284", change: "+12.5%", icon: Truck, color: "text-blue-400", bg: "bg-blue-400/10" },
  { name: "In Transit", value: "42", change: "+3", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
  { name: "Delivered", value: "1,140", change: "+18%", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10" },
  { name: "RTO / Returns", value: "12", change: "-2", icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
];

const weeklyData = [
  { name: "Mon", delivered: 40, rto: 2 },
  { name: "Tue", delivered: 30, rto: 1 },
  { name: "Wed", delivered: 55, rto: 4 },
  { name: "Thu", delivered: 45, rto: 2 },
  { name: "Fri", delivered: 60, rto: 3 },
  { name: "Sat", delivered: 70, rto: 5 },
  { name: "Sun", delivered: 65, rto: 2 },
];

const courierData = [
  { name: "Delhivery", success: 94 },
  { name: "Blue Dart", success: 98 },
  { name: "Xpressbees", success: 91 },
  { name: "Ecom Exp", success: 89 },
];

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Logistics Control Center</h1>
          <p className="text-white/40 text-sm">Real-time overview of your ecommerce shipping performance.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#1D9E75]/20"
        >
          <Package className="w-4 h-4" />
          Create Shipment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-[#131614] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all shadow-xl shadow-black/20">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">{stat.name}</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                stat.change.startsWith('+') ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                {stat.change}
              </span>
            </div>
            <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#131614] border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-white text-lg tracking-tight">Weekly Shipments</h3>
              <p className="text-xs text-white/40 mt-1">Delivered vs RTO volume over the last 7 days.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Delivered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">RTO</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#131614', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="delivered" stroke="#1D9E75" strokeWidth={3} dot={{ fill: '#1D9E75', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="rto" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#131614] border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20 flex flex-col">
          <div className="mb-8">
            <h3 className="font-bold text-white text-lg tracking-tight">Courier Performance</h3>
            <p className="text-xs text-white/40 mt-1">Delivery success rate by courier partner.</p>
          </div>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courierData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#131614', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="success" radius={[0, 4, 4, 0]} barSize={24}>
                  {courierData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.success > 95 ? '#3b82f6' : entry.success > 90 ? '#1D9E75' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#131614] border border-white/5 rounded-3xl overflow-hidden shadow-xl shadow-black/20">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <h3 className="font-bold text-white">Critical Shipments (Action Required)</h3>
            <button className="text-[11px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300">View All NDR</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.01] text-[10px] uppercase tracking-widest text-white/30 font-bold">
                  <th className="px-6 py-4">AWB Number</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Failure Reason</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-red-400 font-bold">AWB9482{i}</td>
                    <td className="px-6 py-4 text-white/80 font-medium">Customer {i}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-white/60">Customer Unavailable</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-bold text-[#1D9E75] hover:underline">Reattempt</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#131614] border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20">
          <h3 className="font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1D9E75]" />
            Live Activity
          </h3>
          <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="pl-8 relative">
                <div className={cn(
                  "absolute left-[3px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#131614] shadow-lg",
                  i === 1 ? "bg-green-400 shadow-green-400/20" : "bg-[#1D9E75] shadow-[#1D9E75]/20"
                )} />
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">10:4{i} AM</p>
                <p className="text-sm text-white/80 font-medium">Shipment AWB9485{i} {i === 1 ? "delivered successfully" : "reached sorting facility"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateShipmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
