import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EKYAN Connect — UNICEF Kenya",
  description: "Real-Time M&E Dashboard · Youth Agripreneurs · Generation Unlimited",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-surface`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
