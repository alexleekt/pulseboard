import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { loadCompanies, upsertCompany } from '@/lib/utils/data-store';
import type { Company } from '@/lib/types';

export async function GET() {
  try {
    const companies = await loadCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load companies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const company: Company = {
      id: body.id || uuidv4(),
      name: body.name,
      values: body.values || '',
      themes: body.themes || '',
      decisionMaking: body.decisionMaking || '',
      culture: body.culture || '',
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    await upsertCompany(company);

    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create/update company' },
      { status: 500 }
    );
  }
}
