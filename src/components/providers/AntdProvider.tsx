'use client';

import React from 'react';
import { ConfigProvider, App } from 'antd';

interface AntdProviderProps {
  children: React.ReactNode;
}

export default function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider 
      theme={{ cssVar: true, hashed: false, token: { colorPrimary: '#1677ff' } }}
    >
      {/* App wrapper enables consumption of message/modal/notification contexts anywhere */}
      <App>{children}</App>
    </ConfigProvider>
  );
}