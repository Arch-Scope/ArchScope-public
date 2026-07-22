import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/context/auth';
import AuthModal from '@/components/features/auth/auth-modal';
import { AppToaster } from '@/components/ui/toaster';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArchScope - System Design Visualizer & Simulator",
  description: "Design, simulate, and optimize high-level system architectures with real AWS service costs and latency modeling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-screen bg-gray-50 overflow-auto">
        <AuthProvider>
          <AuthModal />
          <AppToaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
