import { NextRequest, NextResponse } from 'next/server';
import { getDiary, upsertDiary, deleteDiary } from '@/lib/utils/data-store';
import type { DiaryEntry } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const diary = await getDiary(id);

    if (!diary) {
      return NextResponse.json(
        { error: 'Diary entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(diary);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load diary entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingDiary = await getDiary(id);
    if (!existingDiary) {
      return NextResponse.json(
        { error: 'Diary entry not found' },
        { status: 404 }
      );
    }

    const updatedDiary: DiaryEntry = {
      ...existingDiary,
      ...body,
      id,
      timestamp: body.timestamp ? new Date(body.timestamp) : existingDiary.timestamp,
      updatedAt: new Date(),
    };

    await upsertDiary(updatedDiary);

    return NextResponse.json(updatedDiary);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update diary entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteDiary(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete diary entry' },
      { status: 500 }
    );
  }
}
