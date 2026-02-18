import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SlipScan AI - Moderator Dashboard",
  description: "AI-powered till slip scanning and moderation dashboard for SavvySaver",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geistSans.variable} font-sans antialiased bg-background text-foreground`}>
        <Sidebar />
        <main className="lg:pl-64 min-h-screen transition-all duration-300">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
