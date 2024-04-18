import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./tailwind.css";
import { Toaster } from "~/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InsightUBC",
  description: "Section Insights for UBC Students",
};

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <head></head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
