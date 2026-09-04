import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Attention",
  description:
    "Know what changed while you were away.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}