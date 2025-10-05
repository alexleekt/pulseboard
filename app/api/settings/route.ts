import { NextRequest, NextResponse } from 'next/server';
import { loadSettings, saveSettings } from '@/lib/utils/settings';

export async function GET() {
  try {
    const settings = await loadSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await saveSettings(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
