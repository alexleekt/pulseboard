import { NextRequest, NextResponse } from 'next/server';
import { getMember, upsertMember, deleteMember } from '@/lib/utils/data-store';
import type { TeamMember } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const member = await getMember(id);

    if (!member) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load team member' },
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

    const existingMember = await getMember(id);
    if (!existingMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    const updatedMember: TeamMember = {
      ...existingMember,
      ...body,
      id,
      updatedAt: new Date(),
    };

    await upsertMember(updatedMember);

    return NextResponse.json(updatedMember);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update team member' },
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
    await deleteMember(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    );
  }
}
