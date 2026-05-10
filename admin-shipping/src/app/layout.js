import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Shipping Dashboard — Indo Heals",
  description: "Advanced shipping management dashboard integrated with Shiprocket",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0d0f0e] text-[#e8ede9] antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto bg-[#0d0f0e]">
            <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0d0f0e]/50 backdrop-blur-md sticky top-0 z-50">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-medium text-white/70 tracking-tight">Dashboard Overview</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#1D9E75]/10 border border-[#1D9E75]/20 px-3 py-1.5 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
                  <span className="text-[11px] font-semibold text-[#1D9E75] uppercase tracking-wider">Live System</span>
                </div>
              </div>
            </header>
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
