import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AuthWrapper } from "@/components/auth-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoBid.vn - Đấu giá tự động",
  description: "Nền tảng đấu giá hàng hóa tự động, minh bạch và an toàn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
                <SidebarTrigger />
                <div className="ml-auto flex items-center gap-2">
                  <AuthWrapper />
                </div>
              </header>
              {children}
            </main>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}