import "../styles/global.css";
import React from "react";
import Providers from "../components/providers";

export const metadata = {
  title: "NexTwin AI - Industrial Digital Twin Platform",
  description: "Industrial AI control surface for digital twins, predictive maintenance, energy intelligence, alerts, reports, and factory copilot workflows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
