import { NextResponse } from 'next/server';
import { loadSettings } from '@/lib/utils/settings';
import { OllamaClient } from '@/lib/ollama/client';
import { PulseboardDB } from '@/lib/chromadb/client';

export interface SystemStatus {
  overall: 'operational' | 'degraded' | 'down';
  timestamp: string;
  dependencies: {
    ollama: DependencyStatus;
    models: {
      primary: ModelStatus;
      judge?: ModelStatus;
      embedding: ModelStatus;
    };
    chromadb: DependencyStatus;
    settings: DependencyStatus;
  };
}

interface DependencyStatus {
  status: 'operational' | 'degraded' | 'down';
  message?: string;
  details?: string;
}

interface ModelStatus extends DependencyStatus {
  modelName: string;
}

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Check settings file
    const settingsStatus: DependencyStatus = { status: 'operational' };
    let settings;

    try {
      settings = await loadSettings();
    } catch (error) {
      settingsStatus.status = 'down';
      settingsStatus.message = 'Settings file error';
      settingsStatus.details = error instanceof Error ? error.message : 'Unknown error';
    }

    if (!settings) {
      return NextResponse.json({
        overall: 'down',
        timestamp,
        dependencies: {
          ollama: { status: 'down', message: 'Cannot load settings' },
          models: {
            primary: { status: 'down', modelName: 'unknown' },
            embedding: { status: 'down', modelName: 'unknown' },
          },
          chromadb: { status: 'down', message: 'Cannot load settings' },
          settings: settingsStatus,
        },
      } as SystemStatus);
    }

    // Check Ollama connection
    const ollama = new OllamaClient({
      baseURL: settings.ollama.host,
      primaryModel: settings.ollama.primaryModel,
      judgeModel: settings.ollama.judgeModel,
      embeddingModel: settings.ollama.embeddingModel,
    });

    const ollamaStatus: DependencyStatus = { status: 'operational' };
    let availableModels: string[] = [];

    try {
      const isConnected = await ollama.testConnection();
      if (!isConnected) {
        ollamaStatus.status = 'down';
        ollamaStatus.message = 'Cannot connect to Ollama';
        ollamaStatus.details = `Unable to reach ${settings.ollama.host}`;
      } else {
        availableModels = await ollama.listModels();
      }
    } catch (error) {
      ollamaStatus.status = 'down';
      ollamaStatus.message = 'Ollama connection failed';
      ollamaStatus.details = error instanceof Error ? error.message : 'Unknown error';
    }

    // Helper function to check if model is available
    // Ollama returns models with tags like "model:latest", but config might store "model"
    const isModelAvailable = (modelName: string, availableModels: string[]): boolean => {
      // Direct match
      if (availableModels.includes(modelName)) return true;

      // Check if any available model starts with modelName followed by ":"
      // e.g., "nomic-embed-text" should match "nomic-embed-text:latest"
      const baseMatch = availableModels.some(m =>
        m === modelName || m.startsWith(modelName + ':')
      );
      if (baseMatch) return true;

      // Also check if modelName has a tag but available models don't
      // e.g., "nomic-embed-text:latest" should match "nomic-embed-text"
      const modelBase = modelName.split(':')[0];
      return availableModels.some(m => m === modelBase || m.startsWith(modelBase + ':'));
    };

    // Check model availability
    const primaryModelStatus: ModelStatus = {
      status: 'operational',
      modelName: settings.ollama.primaryModel,
    };
    if (ollamaStatus.status === 'operational') {
      if (!isModelAvailable(settings.ollama.primaryModel, availableModels)) {
        primaryModelStatus.status = 'down';
        primaryModelStatus.message = 'Model not found';
        primaryModelStatus.details = `Run: ollama pull ${settings.ollama.primaryModel}`;
      }
    } else {
      primaryModelStatus.status = 'down';
      primaryModelStatus.message = 'Cannot check model (Ollama down)';
    }

    const embeddingModelStatus: ModelStatus = {
      status: 'operational',
      modelName: settings.ollama.embeddingModel,
    };
    if (ollamaStatus.status === 'operational') {
      if (!isModelAvailable(settings.ollama.embeddingModel, availableModels)) {
        embeddingModelStatus.status = 'down';
        embeddingModelStatus.message = 'Model not found';
        embeddingModelStatus.details = `Run: ollama pull ${settings.ollama.embeddingModel}`;
      }
    } else {
      embeddingModelStatus.status = 'down';
      embeddingModelStatus.message = 'Cannot check model (Ollama down)';
    }

    let judgeModelStatus: ModelStatus | undefined;
    if (settings.ollama.useDualModel && settings.ollama.judgeModel) {
      judgeModelStatus = {
        status: 'operational',
        modelName: settings.ollama.judgeModel,
      };
      if (ollamaStatus.status === 'operational') {
        if (!isModelAvailable(settings.ollama.judgeModel, availableModels)) {
          judgeModelStatus.status = 'down';
          judgeModelStatus.message = 'Model not found';
          judgeModelStatus.details = `Run: ollama pull ${settings.ollama.judgeModel}`;
        }
      } else {
        judgeModelStatus.status = 'down';
        judgeModelStatus.message = 'Cannot check model (Ollama down)';
      }
    }

    // Check ChromaDB connection
    const chromadbStatus: DependencyStatus = { status: 'operational' };
    try {
      if (ollamaStatus.status !== 'operational') {
        chromadbStatus.status = 'degraded';
        chromadbStatus.message = 'Cannot test ChromaDB (Ollama down)';
      } else {
        const chromadb = new PulseboardDB(ollama);
        await chromadb.initialize();
      }
    } catch (error) {
      chromadbStatus.status = 'down';
      chromadbStatus.message = 'ChromaDB connection failed';
      chromadbStatus.details = error instanceof Error ? error.message : 'Unknown error';
    }

    // Determine overall status
    let overall: 'operational' | 'degraded' | 'down' = 'operational';

    if (
      ollamaStatus.status === 'down' ||
      primaryModelStatus.status === 'down' ||
      embeddingModelStatus.status === 'down' ||
      settingsStatus.status === 'down'
    ) {
      overall = 'down';
    } else if (
      chromadbStatus.status === 'down' ||
      (judgeModelStatus && judgeModelStatus.status === 'down')
    ) {
      overall = 'degraded';
    }

    const status: SystemStatus = {
      overall,
      timestamp,
      dependencies: {
        ollama: ollamaStatus,
        models: {
          primary: primaryModelStatus,
          judge: judgeModelStatus,
          embedding: embeddingModelStatus,
        },
        chromadb: chromadbStatus,
        settings: settingsStatus,
      },
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      overall: 'down',
      timestamp,
      dependencies: {
        ollama: { status: 'down', message: 'System error' },
        models: {
          primary: { status: 'down', modelName: 'unknown' },
          embedding: { status: 'down', modelName: 'unknown' },
        },
        chromadb: { status: 'down', message: 'System error' },
        settings: { status: 'down', message: 'System error' },
      },
    } as SystemStatus, { status: 500 });
  }
}
