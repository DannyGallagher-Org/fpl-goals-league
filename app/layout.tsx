import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FPL Goals League",
  description: "A mini-league ranked only by FPL points earned from goals.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
