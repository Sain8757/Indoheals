"use client";

import React from "react";
import { format } from "date-fns";
import { Check, X, Download, Truck, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrdersTable({
  orders,
  currentTab,
  onAccept,
  onReject,
  onGenerateLabel,
  onDownloadInvoice
}) {
  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#131614] rounded-2xl border border-white/5 shadow-xl">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <Truck className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-white font-medium text-lg mb-1">No orders found</h3>
        <p className="text-white/40 text-sm">There are no orders in the {currentTab.replace('_', ' ')} status.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'ready_to_ship': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'shipped': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="bg-[#131614] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[11px] uppercase tracking-widest text-white/40 font-semibold">
              <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded bg-black/50 border-white/10" /></th>
              <th className="px-6 py-4">Product Details</th>
              <th className="px-6 py-4">Order ID & SKU</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Dispatch/SLA</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {orders.map((order) => (
              <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <input type="checkbox" className="rounded bg-black/50 border-white/10" />
                </td>
                <td className="px-6 py-4 min-w-[300px]">
                  <div className="flex items-start gap-4">
                    <img
                      src={order.product.image}
                      alt={order.product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-white/5 border border-white/10"
                    />
                    <div className="whitespace-normal">
                      <p className="text-white/90 font-medium line-clamp-2 leading-tight mb-1">{order.product.name}</p>
                      <div className="flex gap-2 text-xs text-white/40">
                        <span>Qty: <strong className="text-white/70">{order.product.quantity}</strong></span>
                        <span>•</span>
                        <span>Size: <strong className="text-white/70">{order.product.size}</strong></span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-white/90">{order.id}</p>
                    <p className="text-xs text-white/40">SKU: <span className="text-[#1D9E75]">{order.skuId}</span></p>
                    <div className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", getStatusColor(order.status))}>
                      {order.status.replace('_', ' ')}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-white/90 font-medium">{order.customer.name}</p>
                  <p className="text-xs text-white/40 font-mono mt-0.5">{order.customer.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {order.timestamps.dispatchSla ? (
                      <>
                        <p className="text-white/80">{format(new Date(order.timestamps.dispatchSla), "dd MMM yyyy")}</p>
                        {new Date(order.timestamps.dispatchSla) < new Date() && order.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> Breached
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="text-white/40 italic text-xs">N/A</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-white/90 font-semibold">₹{order.payment.amount}</p>
                  <p className="text-xs text-white/40 mt-0.5">{order.payment.method} ({order.payment.status})</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onReject(order.id)}
                          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-red-500/20"
                          title="Cancel Order"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                        <button
                          onClick={() => onAccept(order.id)}
                          className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-lg shadow-[#1D9E75]/20"
                        >
                          <Check className="w-4 h-4" /> Accept
                        </button>
                      </>
                    )}
                    {order.status === 'ready_to_ship' && (
                      <>
                        <button
                          onClick={() => onReject(order.id)}
                          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-red-500/20"
                          title="Cancel Order"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                        <button
                          onClick={() => onGenerateLabel(order.id)}
                          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-500/20"
                        >
                          <Download className="w-4 h-4" /> Generate Label
                        </button>
                      </>
                    )}
                    {(order.status === 'shipped' || order.status === 'delivered') && (
                      <button
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="View Tracking"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Order Details">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
