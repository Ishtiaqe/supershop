import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { themeColors } from "@/lib/theme";
import "./globals.css";
// Ant Design styles
import "antd/dist/reset.css";
import { Providers } from "@/components/providers";
import dynamic from "next/dynamic";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const Shell = dynamic(() => import("@/components/shell/Shell"), { ssr: false });

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
  other: {
    // Preload PWA assets to ensure they're cached early
    "preload:manifest": '<link rel="preload" href="/manifest.json" as="fetch" crossorigin>',
    "preload:pwa-icon": '<link rel="preload" href="/android-chrome-192x192.png" as="image" crossorigin>',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: themeColors.light.primary.hex,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sentry is initialized via `sentry.client.config.js` and `sentry.server.config.js` in Next.js
  return (
    <html lang="en">
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
          <Shell>{children}</Shell>
          <SpeedInsights />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
