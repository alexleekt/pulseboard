import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { loadDiaryDrafts, deleteDiaryDraft, getMember, upsertDiary } from '@/lib/utils/data-store';
import type { TeamMember } from '@/lib/types';

const slugifyHandle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const ensureBase = (text: string | undefined, fallback: string) => {
  const base = slugifyHandle(text ?? '');
  return base || fallback.toLowerCase();
};

const buildMemberHandle = (member: TeamMember) =>
  `@${ensureBase(member.fullName || member.name, member.id.slice(0, 6))}`;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const memberIdsInput = Array.isArray(body.memberIds)
      ? body.memberIds
      : body.memberId
        ? [body.memberId]
        : [];
    const memberIds = Array.from(
      new Set(memberIdsInput.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))
    );

    if (memberIds.length === 0) {
      return NextResponse.json({ error: 'memberIds is required' }, { status: 400 });
    }

    const drafts = await loadDiaryDrafts();
    const draft = drafts.find((d) => d.id === id);

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    const timestamp = new Date();
    const createdEntries: Array<{
      id: string;
      memberId: string;
      companyId: string;
      name: string;
      handle: string;
      entryId: string;
    }> = [];

    for (const memberId of memberIds) {
      const member = await getMember(memberId);
      if (!member) {
        continue;
      }

      const entry = await upsertDiary({
        id: uuidv4(),
        memberId: member.id,
        companyId: member.companyId,
        content: draft.content,
        timestamp,
        tags: [],
        projects: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      createdEntries.push({
        id: member.id,
        name: member.fullName || member.name,
        handle: buildMemberHandle(member),
        companyId: member.companyId,
        memberId: member.id,
        entryId: entry.id,
      });
    }

    if (createdEntries.length === 0) {
      return NextResponse.json({
        error: 'No valid members found for assignment',
      }, { status: 404 });
    }

    await deleteDiaryDraft(id);

    return NextResponse.json({
      status: 'assigned',
      entries: createdEntries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to assign draft',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
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
    await deleteDiaryDraft(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete draft',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
