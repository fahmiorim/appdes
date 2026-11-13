import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
