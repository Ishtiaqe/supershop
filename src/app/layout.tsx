import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// Ant Design styles
import "antd/dist/reset.css";
import { Providers } from "@/components/providers";
import dynamic from "next/dynamic";

const Shell = dynamic(() => import("@/components/shell/Shell"), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SuperShop",
  description: "Complete shop management solution for your business",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
