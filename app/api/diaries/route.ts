import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { loadDiaries, upsertDiary, getDiariesByMember } from '@/lib/utils/data-store';
import type { DiaryEntry } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get('memberId');

    let diaries: DiaryEntry[];
    if (memberId) {
      diaries = await getDiariesByMember(memberId);
    } else {
      diaries = await loadDiaries();
    }

    return NextResponse.json(diaries);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load diary entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const diary: DiaryEntry = {
      id: body.id || uuidv4(),
      memberId: body.memberId,
      companyId: body.companyId,
      content: body.content,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      tags: body.tags || [],
      projects: body.projects || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    await upsertDiary(diary);

    return NextResponse.json(diary);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create/update diary entry' },
      { status: 500 }
    );
  }
}
