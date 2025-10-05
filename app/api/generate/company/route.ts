import { NextRequest, NextResponse } from 'next/server';
import { loadSettings } from '@/lib/utils/settings';
import { OllamaClient } from '@/lib/ollama/client';

export async function POST(request: NextRequest) {
  try {
    const { field, companyName, existingData } = await request.json();

    if (!companyName) {
      return NextResponse.json(
        {
          error: 'Company name is required',
          details: 'Please enter a company name before generating content.'
        },
        { status: 400 }
      );
    }

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
            details: `Unable to reach Ollama at ${settings.ollama.host}. Make sure Ollama is running:\n\n1. Run: ollama serve\n2. Check settings at /settings`,
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

    let prompt = '';

    switch (field) {
      case 'values':
        prompt = `Generate a concise description of core company values for "${companyName}". Keep it to 2-4 sentences focusing on what the company believes in and prioritizes.`;
        break;
      case 'themes':
        prompt = `Generate 2-4 sentences describing the key themes that define "${companyName}"'s mission and work. What topics, industries, or focus areas does this company center on?`;
        break;
      case 'decisionMaking':
        prompt = `Describe in 2-4 sentences how "${companyName}" makes decisions. Consider: Is it consensus-driven? Data-driven? Top-down? Collaborative? Fast or deliberate?`;
        break;
      case 'culture':
        prompt = `Describe the work culture and environment at "${companyName}" in 2-4 sentences. What's it like to work there? What's valued in the workplace?`;
        break;
      case 'all':
        prompt = `Generate a comprehensive company profile for "${companyName}". Include:
1. Core Values (what the company believes in)
2. Key Themes (mission and focus areas)
3. Decision Making approach
4. Work Culture and environment

Format as JSON with keys: values, themes, decisionMaking, culture. Keep each field to 2-4 sentences.`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid field', details: `Unknown field: ${field}` },
          { status: 400 }
        );
    }

    // Add context from existing data if available
    if (existingData && Object.keys(existingData).length > 0) {
      prompt += `\n\nExisting context:\n${JSON.stringify(existingData, null, 2)}\n\nUse this context to ensure consistency.`;
    }

    try {
      const response = await ollama.chat([
        {
          role: 'system',
          content: 'You are a company culture and organizational expert. Generate realistic, professional company descriptions. Be concise and specific.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      if (field === 'all') {
        try {
          const jsonMatch = response.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Ensure all fields are strings
            return NextResponse.json({
              values: String(parsed.values || ''),
              themes: String(parsed.themes || ''),
              decisionMaking: String(parsed.decisionMaking || ''),
              culture: String(parsed.culture || ''),
            });
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }

        // If JSON parsing fails, return error
        return NextResponse.json(
          {
            error: 'Failed to parse AI response',
            details: 'The AI returned an invalid JSON format. Try generating individual fields instead.',
            fix: 'Use the individual field generation buttons instead of "Auto-Generate All".'
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ content: response.content.trim() });
    } catch (llmError: any) {
      // Check for model not found error
      if (llmError.message?.includes('model') || llmError.message?.includes('not found')) {
        return NextResponse.json(
          {
            error: 'Model not found',
            details: `The model "${settings.ollama.primaryModel}" is not available.`,
            fix: `Pull the model by running: ollama pull ${settings.ollama.primaryModel}`
          },
          { status: 404 }
        );
      }

      throw llmError;
    }
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      {
        error: 'Generation failed',
        details: error.message || 'An unexpected error occurred while generating content.',
        fix: 'Check the console logs for more details.'
      },
      { status: 500 }
    );
  }
}
