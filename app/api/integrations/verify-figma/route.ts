import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ valid: false }, { status: 400 });

    // Internal background endpoint health-check verification
    const figmaResponse = await fetch('https://api.figma.com/v1/me', {
      headers: { 'X-Figma-Token': token },
    });

    if (figmaResponse.ok) {
      return NextResponse.json({ valid: true });
    }
    return NextResponse.json({ valid: false }, { status: 401 });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}