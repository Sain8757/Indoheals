"use client";

import { useState } from "react";
import { 
  Settings, 
  Shield, 
  MapPin, 
  Bell, 
  Webhook, 
  Save,
  Check,
  AlertTriangle,
  Info,
  ExternalLink,
  Key,
  Truck,
  Ban
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [config, setConfig] = useState({
    shiprocketEnabled: true,
    autoPush: false,
    pickupLocation: "Primary Warehouse",
    warehouseId: "128456",
    webhookUrl: "https://api.indoheals.com/api/shiprocket/webhook",
    apiKey: "sr_live_********************************",
    apiSecret: "********************************",
    blockedPincodes: "737101, 737102, 799001",
    autoCourier: true
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-8 h-8 text-[#1D9E75]" />
            Logistics Configuration
          </h1>
          <p className="text-white/40 text-sm mt-2 font-medium">Global settings for API, automation, couriers, and routing rules.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#1D9E75] hover:bg-[#189060] text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-[#1D9E75]/20"
          disabled={saving}
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 
           saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving Changes..." : saved ? "Settings Saved" : "Save Settings"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">API Credentials</h3>
          <p className="text-xs text-white/30 leading-relaxed font-medium">Connect your Shiprocket account to the dashboard.</p>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#131614] border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-2">
                <Key className="w-3 h-3" />
                Shiprocket Email / Public Key
              </label>
              <input 
                type="text" 
                className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 transition-all"
                value={config.apiKey}
                onChange={(e) => setConfig({...config, apiKey: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Shiprocket Password / Secret Key
              </label>
              <input 
                type="password" 
                className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 transition-all"
                value={config.apiSecret}
                onChange={(e) => setConfig({...config, apiSecret: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-white/5 pt-10">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">General Integration</h3>
          <p className="text-xs text-white/30 leading-relaxed font-medium">Control the core connection and default pickup warehouse.</p>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#131614] border border-white/5 rounded-[2rem] p-8 space-y-8">
            <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center border border-[#1D9E75]/20">
                  <Shield className="w-6 h-6 text-[#1D9E75]" />
                </div>
                <div>
                  <p className="font-bold text-white">Shiprocket Automation</p>
                  <p className="text-xs text-white/40 mt-1">Enable automated order pushing and label generation.</p>
                </div>
              </div>
              <button 
                onClick={() => setConfig({...config, shiprocketEnabled: !config.shiprocketEnabled})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  config.shiprocketEnabled ? "bg-[#1D9E75]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  config.shiprocketEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Default Pickup Location</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#1D9E75] transition-colors" />
                    <input 
                      type="text" 
                      className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 transition-all"
                      value={config.pickupLocation}
                      onChange={(e) => setConfig({...config, pickupLocation: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Warehouse ID (Optional)</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-[#1D9E75]/40 transition-all"
                    value={config.warehouseId}
                    onChange={(e) => setConfig({...config, warehouseId: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-t border-white/5 pt-10">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Courier & Routing Rules</h3>
          <p className="text-xs text-white/30 leading-relaxed font-medium">Set preferences for couriers and block high RTO areas.</p>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#131614] border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Truck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Auto Courier Selection</p>
                  <p className="text-xs text-white/40 mt-1">Automatically assign the cheapest/fastest courier.</p>
                </div>
              </div>
              <button 
                onClick={() => setConfig({...config, autoCourier: !config.autoCourier})}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  config.autoCourier ? "bg-[#1D9E75]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  config.autoCourier ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 flex items-center gap-2">
                <Ban className="w-3 h-3 text-red-400" />
                Blocked Pincodes (Comma Separated)
              </label>
              <textarea 
                className="w-full bg-[#0d0f0e] border border-white/5 rounded-2xl py-4 px-4 text-sm text-white focus:outline-none focus:border-red-500/40 transition-all resize-none h-24"
                value={config.blockedPincodes}
                onChange={(e) => setConfig({...config, blockedPincodes: e.target.value})}
                placeholder="e.g. 110001, 400001"
              />
              <p className="text-[11px] text-white/30 mt-2 ml-1">Orders from these pincodes will be flagged and not pushed automatically.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
