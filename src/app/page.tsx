"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import api from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async function checkSession() {
      try {
        const resp = await api.get('/users/me');
        if (resp?.data) {
          router.push('/dashboard');
          return;
        }
      } catch {
        // Not authenticated
      }
      router.push('/login');
    })();
  }, [router]);

  return null; // Or a loading spinner if desired
}
