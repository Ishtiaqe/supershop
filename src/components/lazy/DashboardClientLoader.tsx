"use client";

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const DashboardClient = dynamic(() => import('@/app/dashboard/Dashboard.client'), { ssr: false });

export default function DashboardClientLoader() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? <DashboardClient /> : null}
    </div>
  );
}
