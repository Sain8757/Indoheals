"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, Download, FileText } from "lucide-react";
import OrdersTable from "@/components/orders/OrdersTable";
import { MOCK_ORDERS } from "@/lib/mockOrders";

const TABS = [
  { id: "all", label: "All Orders" },
  { id: "pending", label: "Pending" },
  { id: "ready_to_ship", label: "Ready to Ship" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [currentTab, setCurrentTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState(MOCK_ORDERS);

  // Filter orders based on tab and search
  const filteredOrders = orders.filter((order) => {
    const matchesTab = currentTab === "all" || order.status === currentTab;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.skuId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Action Handlers
  const handleAcceptOrder = (orderId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'ready_to_ship' } : o
    ));
  };

  const handleRejectOrder = (orderId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled', cancelReason: 'Admin Rejected' } : o
    ));
  };

  const handleGenerateLabel = (orderId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? {
        ...o,
        status: 'shipped',
        shipping: { ...o.shipping, trackingId: 'TRK' + Math.floor(Math.random() * 1000000) }
      } : o
    ));
  };

  // Get counts for tabs
  const getTabCount = (tabId) => {
    if (tabId === 'all') return orders.length;
    return orders.filter(o => o.status === tabId).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Order Management</h1>
          <p className="text-white/40 text-sm">Manage incoming orders, dispatch, and fulfillments.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-[#131614] border border-white/10 hover:bg-white/5 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#1D9E75]/20">
            <FileText className="w-4 h-4" /> Bulk Accept
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-white/5">
        <div className="flex gap-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`pb-4 text-sm font-medium transition-all relative whitespace-nowrap ${currentTab === tab.id ? "text-[#1D9E75]" : "text-white/40 hover:text-white/70"
                }`}
            >
              {tab.label} <span className="ml-1 text-xs opacity-50">({getTabCount(tab.id)})</span>
              {currentTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1D9E75] rounded-t-full shadow-[0_-2px_8px_rgba(29,158,117,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#131614] p-4 rounded-2xl border border-white/5 shadow-lg flex flex-col lg:flex-row gap-4 items-center justify-between sticky top-16 z-40">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm font-medium text-white/70 hover:bg-white/[0.06] transition-colors whitespace-nowrap">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
          <select className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 text-sm text-white/70 outline-none focus:border-[#1D9E75] w-full lg:w-auto">
            <option value="all">SLA Status</option>
            <option value="breached">Breached</option>
            <option value="safe">Safe</option>
          </select>
          <select className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-2 text-sm text-white/70 outline-none focus:border-[#1D9E75] w-full lg:w-auto hidden sm:block">
            <option value="all">Payment</option>
            <option value="prepaid">Prepaid</option>
            <option value="cod">COD</option>
          </select>
        </div>
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by Order ID, SKU, or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.02] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#1D9E75] focus:bg-white/[0.05] transition-all"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <OrdersTable
        orders={filteredOrders}
        currentTab={currentTab}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
        onGenerateLabel={handleGenerateLabel}
      />
    </div>
  );
}
