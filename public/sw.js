if (!self.define) {
  let e,
    s = {};
  const n = (n, a) => (
    (n = new URL(n + ".js", a).href),
    s[n] ||
      new Promise((s) => {
        if ("document" in self) {
          const e = document.createElement("script");
          (e.src = n), (e.onload = s), document.head.appendChild(e);
        } else (e = n), importScripts(n), s();
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (a, t) => {
    const i =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[i]) return;
    let c = {};
    const r = (e) => n(e, i),
      u = { module: { uri: i }, exports: c, require: r };
    s[i] = Promise.all(a.map((e) => u[e] || r(e))).then((e) => (t(...e), c));
  };
}
define(["./workbox-4754cb34"], function (e) {
  "use strict";
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "01377453a0d1c22e055ce59684a14775",
        },
        {
          url: "/_next/static/EIrwTM1NKQI54_uC9kf9p/_buildManifest.js",
          revision: "6310079bf1ae7bebeb6a2135896e4564",
        },
        {
          url: "/_next/static/EIrwTM1NKQI54_uC9kf9p/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/1021-6ed2325f166d76f0.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/1110-4979afa8810aa900.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/1652-6aa5f8bcfb6a3095.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/1775-91fae5545fee2de7.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/1923-41fc021820f644e4.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/1928-81f3c381ce282a1d.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/2117-c911db522bb6e16f.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/2359-d64e113457f751d4.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/3356-19aaa043ff7803ae.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/353-1190d80a8fc4c42f.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/3745-6d9afcd3c8eec0b9.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/4290-b9f76c63c1503050.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/5714-00297ad94f8b1851.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/5923-2157a898e6826e56.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/6035-a0774353e229454d.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/6240-ebd743fc680870e8.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/6478-ecb10fcc4b677979.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/648-4af3411500e62a26.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/6509-ef13ae5d924b116a.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/6537-24f6379517c8ca44.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/6784-19bfed89faa0fd4f.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/6819-692520187457e9ab.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/7076-0269f1f160efdefa.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/7218-0c1fd9168fb1d80d.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/8310-dc0a1a6800a7dbe9.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/8377-bfd68850ac86d550.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/8580-01be9718335abf74.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/8582-23db5e0eedb2f64b.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/9979-7f925803741f1285.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-75dcd9c0c345ae3b.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/admin/tenants/page-bbbcdbdeb91664ed.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/auth/callback/page-bd9462b3d1e6e8a8.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/dashboard/brands/page-00829ea9e60777fe.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/dashboard/catalog/page-2c0c9b0e459bab53.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/dashboard/categories/page-b0fda19e152bc27d.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/dashboard/inventory/page-ef3b9d961816063b.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/dashboard/page-87d5d3b33d4e9ab1.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/dashboard/pos/page-6491e4fbfdde0883.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/dashboard/sales/page-d0607b698d617c39.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/layout-76340b5c7d4bf76e.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/login/page-450655a20b655184.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/page-6ba935228fbdc114.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/profile/page-c98372ef0fb1e044.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/app/tenant/setup/page-2e539df504e1775b.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/fd9d1056-358a6784c70417bd.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/framework-8e0e0f4a6b83a956.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/main-7927fa193a59ae42.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/main-app-75c990b8a7965319.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/pages/_app-3c9ca398d360b709.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/pages/_error-cf5ca766ac8f493f.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-af39fe9b2250dd34.js",
          revision: "EIrwTM1NKQI54_uC9kf9p",
        },
        {
          url: "/_next/static/css/295a33ababb316cf.css",
          revision: "295a33ababb316cf",
        },
        {
          url: "/_next/static/media/19cfc7226ec3afaa-s.woff2",
          revision: "9dda5cfc9a46f256d0e131bb535e46f8",
        },
        {
          url: "/_next/static/media/21350d82a1f187e9-s.woff2",
          revision: "4e2553027f1d60eff32898367dd4d541",
        },
        {
          url: "/_next/static/media/8e9860b6e62d6359-s.woff2",
          revision: "01ba6c2a184b8cba08b0d57167664d75",
        },
        {
          url: "/_next/static/media/ba9851c3c22cd980-s.woff2",
          revision: "9e494903d6b0ffec1a1e14d34427d44d",
        },
        {
          url: "/_next/static/media/c5fe6dc8356a8c31-s.woff2",
          revision: "027a89e9ab733a145db70f09b8a18b42",
        },
        {
          url: "/_next/static/media/df0a9ae256c0569c-s.woff2",
          revision: "d54db44de5ccb18886ece2fda72bdfe0",
        },
        {
          url: "/_next/static/media/e4af272ccee01ff0-s.p.woff2",
          revision: "65850a373e258f1c897a2b3d75eb74de",
        },
        { url: "/favicon.svg", revision: "209006f44a388baaad5889348203703f" },
        {
          url: "/icons/icon-192x192.png",
          revision: "c9c7d6b99986f8e3825874be3179b1db",
        },
        {
          url: "/icons/icon-512x512.png",
          revision: "c9c7d6b99986f8e3825874be3179b1db",
        },
        { url: "/manifest.json", revision: "6c5e550e97fd97d3349415481acea211" },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: n,
              state: a,
            }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith("/api/auth/") && !!s.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET"
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET"
    );
});
