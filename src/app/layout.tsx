import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { themeColors } from "@/lib/theme";
import "./globals.css";
// Ant Design styles
import "antd/dist/reset.css";
import { Providers } from "@/components/providers";
import AppShellGate from "@/components/layout/AppShellGate";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SuperShop",
  description: "Complete shop management solution for your business",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: themeColors.light.primary.hex,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sentry is initialized via `sentry.client.config.js` and `sentry.server.config.js` in Next.js
  return (
    <html lang="en" className={cn("font-sans")}>
      <head>
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link
          rel="preconnect"
          href="https://va.vercel-scripts.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {process.env.NEXT_PUBLIC_GA_TRACKING_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_TRACKING_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_TRACKING_ID}');
                  `}
              </Script>
            </>
          )}
          <AppShellGate>{children}</AppShellGate>
          <SpeedInsights />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
