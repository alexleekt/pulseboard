import { OllamaClient } from '@/lib/ollama/client';
import { loadSettings } from '@/lib/utils/settings';

/**
 * Legacy helper preserved for routes that expect a factory at this path.
 */
export async function getOllamaClient() {
  const settings = await loadSettings();

  return new OllamaClient({
    baseURL: settings.ollama.host,
    primaryModel: settings.ollama.primaryModel,
    judgeModel: settings.ollama.judgeModel,
    embeddingModel: settings.ollama.embeddingModel,
  });
}

export { OllamaClient };
