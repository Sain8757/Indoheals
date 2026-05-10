"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  PackagePlus, 
  MapPin, 
  Truck, 
  Ruler, 
  Weight, 
  IndianRupee,
  ShieldCheck
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CreateShipmentModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#131614] border border-white/10 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center border border-[#1D9E75]/20">
                <PackagePlus className="w-5 h-5 text-[#1D9E75]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Create New Shipment</h2>
                <p className="text-xs text-white/40 mt-1">Step {step} of 2 • Package Details</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            
            {step === 1 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                      <Weight className="w-3 h-3" />
                      Weight (kg)
                    </label>
                    <input 
                      type="number" 
                      placeholder="e.g. 1.5"
                      className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                      <Ruler className="w-3 h-3" />
                      Dimensions (L x W x H) cm
                    </label>
                    <div className="flex gap-2">
                      <input type="number" placeholder="L" className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 text-center" />
                      <input type="number" placeholder="W" className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 text-center" />
                      <input type="number" placeholder="H" className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 text-center" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Pickup Location
                  </label>
                  <select className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 appearance-none">
                    <option>Primary Warehouse (New Delhi)</option>
                    <option>Secondary Hub (Mumbai)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                      <IndianRupee className="w-3 h-3" />
                      Payment Type
                    </label>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-[#1D9E75]/10 border border-[#1D9E75]/20 text-[#1D9E75] py-3 rounded-xl text-sm font-bold transition-all">Prepaid</button>
                      <button className="flex-1 bg-white/5 border border-white/10 text-white/40 hover:text-white py-3 rounded-xl text-sm font-bold transition-all">COD</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                      <ShieldCheck className="w-3 h-3" />
                      Package Insurance
                    </label>
                    <div className="flex items-center gap-3 bg-[#0d0f0e] border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/[0.02]">
                      <input type="checkbox" className="accent-[#1D9E75] w-4 h-4 cursor-pointer" />
                      <span className="text-sm text-white font-medium">Secure this shipment</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-white">Select Courier Partner</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { name: "Delhivery Surface", rate: 85, eta: "3-4 Days", recommended: true },
                    { name: "Blue Dart Express", rate: 140, eta: "1-2 Days", recommended: false },
                    { name: "Xpressbees", rate: 78, eta: "4-5 Days", recommended: false },
                  ].map((courier, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all",
                      courier.recommended ? "bg-[#1D9E75]/10 border-[#1D9E75]/20" : "bg-[#0d0f0e] border-white/5 hover:border-white/20"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full border-2 border-white/20 flex items-center justify-center">
                          {courier.recommended && <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm flex items-center gap-2">
                            {courier.name}
                            {courier.recommended && <span className="text-[9px] bg-[#1D9E75] text-white px-1.5 py-0.5 rounded uppercase tracking-widest">Best Rate</span>}
                          </p>
                          <p className="text-xs text-white/40 mt-1">ETA: {courier.eta}</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white">₹{courier.rate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5 bg-[#0d0f0e] flex items-center justify-between">
            {step === 2 ? (
              <button 
                onClick={() => setStep(1)}
                className="text-white/60 hover:text-white text-sm font-bold transition-all px-4 py-2"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            
            <button 
              onClick={() => step === 1 ? setStep(2) : onClose()}
              className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-[#1D9E75]/20"
            >
              {step === 1 ? "Choose Courier" : "Generate Shipment"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
