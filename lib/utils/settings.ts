import { promises as fs } from 'fs';
import path from 'path';
import type { AppSettings } from '@/lib/types';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

const DEFAULT_SETTINGS: AppSettings = {
  ollama: {
    host: 'http://localhost:11434',
    primaryModel: 'qwen2.5:14b',
    judgeModel: 'qwen2.5:32b',
    embeddingModel: 'nomic-embed-text',
  },
  mcp: {
    servers: [],
  },
  features: {
    dualModelEnabled: false,
    defaultTimeRange: '3M',
  },
};

/**
 * Load settings from JSON file
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create with defaults
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to JSON file
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  // Ensure data directory exists
  const dataDir = path.dirname(SETTINGS_PATH);
  await fs.mkdir(dataDir, { recursive: true });

  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * Update partial settings
 */
export async function updateSettings(
  partial: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await loadSettings();
  const updated = {
    ...current,
    ...partial,
    ollama: { ...current.ollama, ...partial.ollama },
    mcp: { ...current.mcp, ...partial.mcp },
    features: { ...current.features, ...partial.features },
  };
  await saveSettings(updated);
  return updated;
}

/**
 * Get default settings
 */
export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}
