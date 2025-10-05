import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { loadCompanies, loadMembers, upsertDiary, loadDiaryDrafts, upsertDiaryDraft } from '@/lib/utils/data-store';
import { loadSettings } from '@/lib/utils/settings';
import { OllamaClient } from '@/lib/ollama/client';

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

const buildMemberHandle = (member: Awaited<ReturnType<typeof loadMembers>>[number]) =>
  `@${ensureBase(member.fullName || member.name, member.id.slice(0, 6))}`;

const buildCompanyHandle = (company: Awaited<ReturnType<typeof loadCompanies>>[number]) =>
  `^${ensureBase(company.name, company.id.slice(0, 6))}`;

function buildMemberContext(members: Awaited<ReturnType<typeof loadMembers>>, companies: Awaited<ReturnType<typeof loadCompanies>>) {
  const companyMap = new Map(companies.map((company) => [company.id, company]));
  return members
    .map((member) => {
      const company = companyMap.get(member.companyId);
      return [
        `Member ID: ${member.id}`,
        `Name: ${member.fullName || member.name}`,
        `Company: ${company?.name ?? 'Unknown'}`,
        member.role ? `Role: ${member.role}` : undefined,
        member.superpowers?.length ? `Superpowers: ${member.superpowers.join(', ')}` : undefined,
        member.growthAreas?.length ? `Growth Areas: ${member.growthAreas.join(', ')}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

export async function GET() {
  const drafts = await loadDiaryDrafts();
  return NextResponse.json({ drafts });
}

export async function POST(request: NextRequest) {
  try {
    const { content, mentionMemberIds = [], mentionCompanyIds = [] } = await request.json();
    const trimmed = typeof content === 'string' ? content.trim() : '';

    if (!trimmed) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const [members, companies] = await Promise.all([loadMembers(), loadCompanies()]);

    const memberMap = new Map(members.map((member) => [member.id, member]));
    const companyMap = new Map(companies.map((company) => [company.id, company]));

    const uniqueMentionMemberIds = Array.from(
      new Set(
        (Array.isArray(mentionMemberIds) ? mentionMemberIds : [])
          .filter((id): id is string => typeof id === 'string' && memberMap.has(id))
      )
    );
    const uniqueMentionCompanyIds = Array.from(
      new Set(
        (Array.isArray(mentionCompanyIds) ? mentionCompanyIds : [])
          .filter((id): id is string => typeof id === 'string' && companyMap.has(id))
      )
    );

    let classification: {
      matchType: 'member' | 'unassigned';
      memberId?: string;
      reasoning?: string;
    } = { matchType: 'unassigned', reasoning: 'LLM classification not attempted.' };

    if (uniqueMentionMemberIds.length === 1) {
      // Direct assignment when exactly one teammate is tagged
      const memberId = uniqueMentionMemberIds[0];
      const member = memberMap.get(memberId);
      if (member) {
        const timestamp = new Date();
        const diary = await upsertDiary({
          id: uuidv4(),
          memberId: member.id,
          companyId: member.companyId,
          content: trimmed,
          timestamp,
          tags: [],
          projects: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        return NextResponse.json({
          status: 'assigned',
          entry: diary,
          member: {
            id: member.id,
            name: member.fullName || member.name,
            handle: buildMemberHandle(member),
          },
          reasoning: 'Assigned via explicit handle mention.',
        });
      }
    }

    try {
      const settings = await loadSettings();
      const ollama = new OllamaClient({
        baseURL: settings.ollama.host,
        primaryModel: settings.ollama.primaryModel,
        judgeModel: settings.ollama.judgeModel,
        embeddingModel: settings.ollama.embeddingModel,
      });

      const memberContext = buildMemberContext(members, companies);
      const messages = [
        {
          role: 'system' as const,
          content:
            'You are a routing assistant. Given a diary entry, pick the best member to own it or return "unassigned" when no obvious match exists. Respond with JSON only.',
        },
        {
          role: 'user' as const,
          content: `Diary Entry:\n"""${trimmed}"""\n\nTeam Members:\n${memberContext}\n\nRespond strictly in JSON with this shape:\n{\n  "matchType": "member" | "unassigned",\n  "memberId"?: string,\n  "reasoning": string\n}\nPick a member only if the diary clearly belongs to them. Otherwise mark as "unassigned" with reasoning.`,
        },
      ];

      const mentionSummary = [
        uniqueMentionMemberIds.length
          ? `Mentioned members: ${uniqueMentionMemberIds
              .map((id) => {
                const member = memberMap.get(id);
                return member
                  ? `${buildMemberHandle(member)} — ${member.fullName || member.name}`
                  : undefined;
              })
              .filter(Boolean)
              .join(', ')}`
          : undefined,
        uniqueMentionCompanyIds.length
          ? `Mentioned companies: ${uniqueMentionCompanyIds
              .map((id) => {
                const company = companyMap.get(id);
                return company
                  ? `${buildCompanyHandle(company)} — ${company.name}`
                  : undefined;
              })
              .filter(Boolean)
              .join(', ')}`
          : undefined,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ollama.chat([
        messages[0],
        {
          role: 'user',
          content:
            messages[1].content + (mentionSummary ? `\n\nExplicit mentions (strong signals):\n${mentionSummary}` : ''),
        },
      ]);
      const raw = response.content.trim();
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/```\s*([\s\S]*?)```/);
      const payload = jsonMatch ? jsonMatch[1] : raw;
      const parsed = JSON.parse(payload);

      if (
        parsed &&
        (parsed.matchType === 'member' || parsed.matchType === 'unassigned') &&
        (parsed.matchType === 'unassigned' || typeof parsed.memberId === 'string')
      ) {
        classification = {
          matchType: parsed.matchType,
          memberId: parsed.memberId,
          reasoning: parsed.reasoning,
        };
      } else {
        classification = {
          matchType: 'unassigned',
          reasoning: 'Model produced an unexpected format. Stored as draft.',
        };
      }
    } catch (error) {
      classification = {
        matchType: 'unassigned',
        reasoning:
          error instanceof Error ? `LLM classification failed: ${error.message}` : 'LLM classification failed due to unknown error.',
      };
    }

    if (classification.matchType === 'member' && classification.memberId) {
      const member = members.find((m) => m.id === classification.memberId);
      if (member) {
        const timestamp = new Date();
        const diary = await upsertDiary({
          id: uuidv4(),
          memberId: member.id,
          companyId: member.companyId,
          content: trimmed,
          timestamp,
          tags: [],
          projects: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        return NextResponse.json({
          status: 'assigned',
          entry: diary,
          member: {
            id: member.id,
            name: member.fullName || member.name,
            handle: buildMemberHandle(member),
          },
          reasoning: classification.reasoning,
        });
      }
    }

    const draft = await upsertDiaryDraft({
      id: uuidv4(),
      content: trimmed,
      suggestedMemberId: classification.memberId,
      reasoning: classification.reasoning,
      mentionedMemberIds: uniqueMentionMemberIds,
      mentionedCompanyIds: uniqueMentionCompanyIds,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ status: 'draft', draft });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process diary entry',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
