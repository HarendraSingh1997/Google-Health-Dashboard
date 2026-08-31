import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Outfit, Oxanium } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const oxaniumHeading = Oxanium({subsets:['latin'],variable:'--font-heading'});

const outfit = Outfit({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Google Health Dashboard",
  description: "Insights and charts from your Google Health / Fitbit export",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", outfit.variable, oxaniumHeading.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
