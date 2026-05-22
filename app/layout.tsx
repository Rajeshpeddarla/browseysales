import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Browsey for Sales — AI-Powered Prospect Research in 8 Seconds",
  description:
    "Visit any company website, get a sales-ready prospect brief with pain points, tech stack, decision-makers, and personalized outreach. Push to your CRM in one click.",
  metadataBase: new URL("https://browseysales.app"),
  openGraph: {
    title: "Browsey for Sales — AI Sales Intelligence",
    description:
      "AI-powered prospect briefs with tech stack detection, decision-maker enrichment, and one-click CRM push. Replace fragmented sales research tools.",
    type: "website",
  },
  icons: { icon: "/logo.png" },
  keywords: [
    "sales intelligence",
    "prospect research",
    "AI sales tool",
    "CRM integration",
    "outbound sales",
    "sales automation",
    "prospect brief",
    "tech stack detection",
    "decision maker enrichment",
    "sales playbook",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className="min-h-screen bg-bg font-sans text-text antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
