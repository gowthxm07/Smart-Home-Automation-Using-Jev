import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeMind — Context-Aware Multi-Device Smart Home Automation",
  description:
    "Software-simulated context-aware multi-device smart home automation and research evaluation platform across AI decision engines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 antialiased selection:bg-accent-blue/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
