import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/workspace-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "LT-1 Islamiyah | Ruang Lomba",
  description:
    "Platform pengelolaan tugas, penilaian, lencana, dan sertifikat Lomba Tingkat 1 Pramuka Islamiyah.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#1B7A3E",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
