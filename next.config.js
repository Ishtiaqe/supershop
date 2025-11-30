/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Changed to enable dynamic SSR for server-rendered dashboard (Option 3)
  output: process.env.NEXT_PUBLIC_OUTPUT === 'export' ? 'export' : undefined,
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  transpilePackages: [
    "antd",
    "@ant-design/icons",
    "@ant-design/icons-svg",
    "rc-util",
    "rc-pagination",
    "rc-picker",
    "rc-tree",
    "rc-table",
  ],
  modularizeImports: {
    "@ant-design/icons": {
      transform: "@ant-design/icons/{{member}}",
    },
  },
  // headers() is not supported with output: 'export'
  async headers() {
    if (process.env.NEXT_PUBLIC_OUTPUT === 'export') {
      return [];
    }
    return [
      {
        source: '/:all*(svg|jpg|png)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          }
        ],
      },
      {
        source: '/:all*(js|css|woff|woff2)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          }
        ],
      },
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          }
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          }
        ],
      },
    ]
  },
};

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  swSrc: "src/sw.js",
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(withPWA(nextConfig));
