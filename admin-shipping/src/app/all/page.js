"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  PackageCheck,
  AlertCircle,
  Truck,
  RotateCcw
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { socket } from "@/lib/socket";
import { ShipmentDrawer } from "@/components/ShipmentDrawer";
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getPaginationRowModel,
  getFilteredRowModel 
} from "@tanstack/react-table";

// Dummy Data
const MOCK_DATA = Array.from({ length: 45 }).map((_, i) => ({
  id: `ORD-94${800 + i}`,
  customer: `Customer ${i + 1}`,
  phone: `+91 9876543${(200 + i).toString().slice(0,3)}`,
  courier: i % 3 === 0 ? "Delhivery" : i % 2 === 0 ? "Blue Dart" : "Ecom Express",
  awb: `AWB${847593847 + i}`,
  payment: i % 4 === 0 ? "COD" : "Prepaid",
  amount: 1200 + (i * 50),
  eta: `May ${10 + (i % 5)}, 2026`,
  status: i % 7 === 0 ? "RTO" : i % 5 === 0 ? "Delivered" : i % 3 === 0 ? "Pending" : "In Transit",
}));

const statusColors = {
  "Delivered": "bg-green-500/10 text-green-400 border-green-500/20",
  "In Transit": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Pending": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "RTO": "bg-red-500/10 text-red-400 border-red-500/20",
  "Cancelled": "bg-gray-500/10 text-gray-400 border-gray-500/20"
};

export default function AllShipmentsPage() {
  const [data, setData] = useState(MOCK_DATA);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState({});
  const [drawerData, setDrawerData] = useState(null);

  useEffect(() => {
    socket.connect();
    socket.on("shipment_updated", (update) => {
      setData(prev => prev.map(item => {
        if (item.awb === update.awb || item.id === update.orderId) {
          // Map backend status to UI status
          let uiStatus = "In Transit";
          if (update.status === "delivered") uiStatus = "Delivered";
          else if (update.status === "cancelled") uiStatus = "Cancelled";
          
          return { ...item, status: uiStatus };
        }
        return item;
      }));
    });
    return () => {
      socket.off("shipment_updated");
      socket.disconnect();
    };
  }, []);

  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <input 
          type="checkbox" 
          className="accent-[#1D9E75] w-4 h-4 cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input 
          type="checkbox" 
          className="accent-[#1D9E75] w-4 h-4 cursor-pointer"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    },
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => <span className="font-mono text-xs text-white font-bold">{row.original.id}</span>
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-white/90 font-semibold text-xs">{row.original.customer}</span>
          <span className="text-[10px] text-white/40">{row.original.phone}</span>
        </div>
      )
    },
    {
      accessorKey: "courier",
      header: "Courier",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-medium text-white/80">
          <Truck className="w-3 h-3 text-[#1D9E75]" />
          {row.original.courier}
        </span>
      )
    },
    {
      accessorKey: "awb",
      header: "AWB Number",
      cell: ({ row }) => <span className="text-xs text-[#1D9E75] font-mono hover:underline cursor-pointer">{row.original.awb}</span>
    },
    {
      accessorKey: "payment",
      header: "Payment",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className={cn("text-xs font-bold", row.original.payment === "COD" ? "text-amber-400" : "text-blue-400")}>{row.original.payment}</span>
          <span className="text-[10px] text-white/60">{formatCurrency(row.original.amount)}</span>
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", statusColors[row.original.status])}>
          {row.original.status}
        </span>
      )
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <button 
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all" 
            title="View Details"
            onClick={() => setDrawerData(row.original)}
          >
            <FileText className="w-4 h-4" />
          </button>
          <button className="p-2 bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 rounded-lg text-[#1D9E75] transition-all" title="Track">
            <Search className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      rowSelection: selectedRowIds,
    },
    onRowSelectionChange: setSelectedRowIds,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">All Shipments</h1>
          <p className="text-white/40 text-sm mt-1">Manage and track your entire logistics pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(selectedRowIds).length > 0 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl mr-2">
              <span className="text-xs font-bold text-white/60">{Object.keys(selectedRowIds).length} selected</span>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all" title="Bulk Print">
                <Printer className="w-4 h-4" />
              </button>
              <button className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-[#1D9E75] transition-all" title="Bulk Update">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
          <button className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[#131614] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {["All", "Pending", "In Transit", "Delivered", "RTO"].map(tab => (
              <button key={tab} className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all whitespace-nowrap">
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                type="text" 
                placeholder="Search orders, AWB..." 
                className="bg-[#0d0f0e] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 w-full md:w-64 transition-all"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
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
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="bg-white/[0.01] border-b border-white/5">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 text-[10px] uppercase tracking-widest text-white/30 font-bold whitespace-nowrap">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className={cn("group transition-colors", row.getIsSelected() ? "bg-[#1D9E75]/5" : "hover:bg-white/[0.02]")}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-white/40">
                    No shipments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-xs text-white/40 font-medium">
            Showing {table.getRowModel().rows.length} of {data.length} shipments
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 transition-all disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white/60">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button 
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 transition-all disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <ShipmentDrawer 
        isOpen={!!drawerData} 
        data={drawerData} 
        onClose={() => setDrawerData(null)} 
      />
    </div>
  );
}
