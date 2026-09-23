import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeMind — Context-Aware Smart Home Decision Engine",
  description:
    "Simulated context-aware multi-device smart home automation environment (Phase 1 Foundation).",
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
