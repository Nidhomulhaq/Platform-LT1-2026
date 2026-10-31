import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/workspace-state";
import "./globals.css";

export const metadata: Metadata = {
  title: "LT-1 Islamiyah | Ruang Lomba",
  description:
    "Platform pengelolaan tugas, penilaian, lencana, dan sertifikat Lomba Tingkat 1 Pramuka Islamiyah.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
