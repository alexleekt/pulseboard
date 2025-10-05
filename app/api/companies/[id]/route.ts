import { NextRequest, NextResponse } from 'next/server';
import { getCompany, deleteCompany, upsertCompany } from '@/lib/utils/data-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = await getCompany(id);

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load company' },
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

    const company = {
      ...body,
      id: id,
      updatedAt: new Date(),
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
    };

    await upsertCompany(company);

    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update company' },
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
    await deleteCompany(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}
