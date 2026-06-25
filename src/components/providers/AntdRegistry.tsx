"use client";

import React, { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { StyleProvider, createCache, extractStyle } from "@ant-design/cssinjs";
import type Entity from "@ant-design/cssinjs/es/Cache";

// Antd App Router SSR fix: without this, antd CSS-in-JS injects <style> tags on
// the client that weren't in the server HTML → hydration mismatch (the div-in-div
// error seen on the hard-navigation to /login during logout).
// https://ant.design/docs/react/use-with-next
export default function AntdRegistry({ children }: { children: React.ReactNode }) {
  const cache = useRef<Entity>(createCache()).current;

  useServerInsertedHTML(() => (
    <style
      id="antd"
      dangerouslySetInnerHTML={{ __html: extractStyle(cache, true) }}
    />
  ));

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
