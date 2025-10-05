import { NextRequest, NextResponse } from 'next/server';
import { getMember, getDiariesByMember, getMembersByCompany, loadDiaries, getCompany } from '@/lib/utils/data-store';
import { loadSettings } from '@/lib/utils/settings';
import { OllamaClient } from '@/lib/ollama/client';

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId is required' },
        { status: 400 }
      );
    }

    // Get member information
    const member = await getMember(memberId);
    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    const fallbackName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
    const displayName = member.fullName || fallbackName || member.name || 'this team member';

    // Get company context
    const company = await getCompany(member.companyId);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get all diary entries for this member
    const memberDiaries = await getDiariesByMember(memberId);

    if (memberDiaries.length === 0) {
      return NextResponse.json(
        {
          error: 'No diary entries found',
          details: 'This member needs to have diary entries before a profile can be generated.',
          fix: 'Add some work diary entries first, then try again.'
        },
        { status: 400 }
      );
    }

    // Get all team members and their diaries from the same company
    const allCompanyMembers = await getMembersByCompany(member.companyId);
    const allDiaries = await loadDiaries();

    // Filter diaries from the same company (excluding the current member)
    const otherMemberDiaries = allDiaries.filter(
      d => d.companyId === member.companyId && d.memberId !== memberId
    );

    // Build context from member's own diary
    const memberWorkContext = memberDiaries
      .slice(0, 50) // Limit to last 50 entries
      .map(d => `[${new Date(d.timestamp).toLocaleDateString()}] ${d.content}`)
      .join('\n\n');

    // Build context from other team members' diaries
    const teamContext = otherMemberDiaries
      .slice(0, 30) // Limit to 30 recent entries from team
      .map(d => {
        const teamMember = allCompanyMembers.find(m => m.id === d.memberId);
        const teamMemberName = teamMember?.fullName || teamMember?.name || 'Unknown';
        return `[${teamMemberName}] ${d.content}`;
      })
      .join('\n\n');

    const prompt = `You are analyzing a team member's work diary and team interactions to create a professional profile.

COMPANY CONTEXT:
Company: ${company.name}
Values: ${company.values}
Themes: ${company.themes}

TEAM MEMBER: ${displayName}
Role: ${member.role || 'Not specified'}

THEIR WORK DIARY (Recent Entries):
${memberWorkContext}

TEAM CONTEXT (What colleagues have been working on):
${teamContext}

Based on this information, analyze ${displayName}'s contributions and generate:

1. **Influence**: How does this person influence the team and organization? Look for:
   - Leadership in initiatives
   - Mentoring or helping others
   - Cross-team collaboration
   - Decision-making impact

2. **Project Impacts**: What concrete impact have they had on projects? Look for:
   - Key deliverables
   - Problem-solving
   - Innovation
   - Quality improvements

3. **Superpowers** (3-5): What are their standout strengths? Examples:
   - Technical skills (e.g., "System Design", "Frontend Architecture")
   - Soft skills (e.g., "Clear Communication", "Mentoring")
   - Domain expertise (e.g., "Payment Systems", "Data Pipeline")

4. **Growth Areas** (3-5): What areas could they develop? Be constructive:
   - Skills to expand
   - New domains to explore
   - Process improvements
   - Leadership opportunities

Respond in valid JSON format:
{
  "influence": "1-2 paragraphs describing their influence",
  "projectImpacts": "1-2 paragraphs describing concrete project impacts",
  "superpowers": ["Strength 1", "Strength 2", "Strength 3"],
  "growthAreas": ["Growth area 1", "Growth area 2", "Growth area 3"]
}

Be specific and evidence-based. Use actual work mentioned in the diaries.`;

    const settings = await loadSettings();
    const ollama = new OllamaClient({
      baseURL: settings.ollama.host,
      primaryModel: settings.ollama.primaryModel,
      judgeModel: settings.ollama.judgeModel,
      embeddingModel: settings.ollama.embeddingModel,
    });

    // Test Ollama connection first
    try {
      const isConnected = await ollama.testConnection();
      if (!isConnected) {
        return NextResponse.json(
          {
            error: 'Cannot connect to Ollama',
            details: `Unable to reach Ollama at ${settings.ollama.host}. Make sure Ollama is running.`,
            fix: 'Start Ollama by running "ollama serve" in your terminal.'
          },
          { status: 503 }
        );
      }
    } catch (connError) {
      return NextResponse.json(
        {
          error: 'Ollama connection failed',
          details: `Could not connect to Ollama at ${settings.ollama.host}`,
          fix: 'Make sure Ollama is installed and running. Visit https://ollama.com to install.'
        },
        { status: 503 }
      );
    }

    const response = await ollama.chat([
      {
        role: 'system',
        content: 'You are an expert in analyzing professional work and team dynamics. Generate accurate, evidence-based assessments.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    const result = response.content;

    // Parse the JSON response
    let profileData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || result.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : result;
      profileData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse LLM response:', result);
      return NextResponse.json(
        {
          error: 'Failed to parse profile data',
          details: 'The AI generated an invalid response format.',
          fix: 'Try again. If the problem persists, check your Ollama model configuration.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      influence: profileData.influence || '',
      projectImpacts: profileData.projectImpacts || '',
      superpowers: Array.isArray(profileData.superpowers) ? profileData.superpowers.slice(0, 5) : [],
      growthAreas: Array.isArray(profileData.growthAreas) ? profileData.growthAreas.slice(0, 5) : [],
    });

  } catch (error) {
    console.error('Profile generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate profile',
        details: error instanceof Error ? error.message : 'Unknown error',
        fix: 'Make sure Ollama is running and the model is available.'
      },
      { status: 500 }
    );
  }
}
