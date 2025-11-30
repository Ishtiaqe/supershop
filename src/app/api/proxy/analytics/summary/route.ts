import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Prefer Authorization header, fall back to cookie accessToken
    const authHeader = req.headers.get('authorization');
    const cookies = req.cookies;
    const accessToken = cookies.get('accessToken')?.value || cookies.get('access_token')?.value;

    const token = authHeader || (accessToken ? `Bearer ${accessToken}` : null);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    const url = `${backendUrl}/sales/analytics/summary`;

    const res = await fetch(url, {
      headers: {
        Authorization: token,
        Accept: 'application/json',
      },
      // do not cache since summary may change frequently
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch analytics summary' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy summary error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
