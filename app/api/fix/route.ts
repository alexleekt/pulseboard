import { NextRequest, NextResponse } from 'next/server';
import { loadSettings } from '@/lib/utils/settings';

export async function POST(request: NextRequest) {
  try {
    const { action, model } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const settings = await loadSettings();

    switch (action) {
      case 'pull-model':
        if (!model) {
          return NextResponse.json(
            { error: 'Model name is required for pull-model action' },
            { status: 400 }
          );
        }

        try {
          // Call Ollama's pull API
          const response = await fetch(`${settings.ollama.host}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: model }),
          });

          if (!response.ok) {
            return NextResponse.json(
              {
                success: false,
                error: 'Failed to pull model',
                details: `Ollama returned ${response.status}: ${response.statusText}`,
              },
              { status: 500 }
            );
          }

          // Read the streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let status = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const text = decoder.decode(value);
              const lines = text.split('\n').filter(Boolean);

              for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  status = data.status || status;
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }

          return NextResponse.json({
            success: true,
            message: `Successfully pulled ${model}`,
            status,
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to pull model',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }

      case 'test-connection':
        try {
          const response = await fetch(`${settings.ollama.host}/api/tags`);
          return NextResponse.json({
            success: response.ok,
            message: response.ok
              ? 'Ollama is reachable'
              : 'Cannot connect to Ollama',
          });
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: 'Connection failed',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Fix action error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
