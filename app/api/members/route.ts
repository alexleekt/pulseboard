import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { loadMembers, upsertMember, getMembersByCompany } from '@/lib/utils/data-store';
import type { TeamMember } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    let members: TeamMember[];
    if (companyId) {
      members = await getMembersByCompany(companyId);
    } else {
      members = await loadMembers();
    }

    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load team members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const member: TeamMember = {
      id: body.id || uuidv4(),
      companyId: body.companyId,
      name: body.name,
      email: body.email,
      role: body.role,
      avatar: body.avatar,
      influence: body.influence || '',
      projectImpacts: body.projectImpacts || '',
      superpowers: body.superpowers || [],
      growthAreas: body.growthAreas || [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    await upsertMember(member);

    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create/update team member' },
      { status: 500 }
    );
  }
}
