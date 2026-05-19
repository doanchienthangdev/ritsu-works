import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider";
import "fumadocs-ui/style.css";

export const metadata = {
  title: "Ritsu Works — Operating Docs",
  description:
    "Live documentation engine for ritsu-works. Operator + AI runtime context bundle (Vietnamese-first).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
