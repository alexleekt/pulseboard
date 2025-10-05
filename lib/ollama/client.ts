import type { LLMMessage, LLMResponse, DualModelResponse } from '@/lib/types';

export class OllamaClient {
  private baseURL: string;
  private primaryModel: string;
  private judgeModel?: string;
  private embeddingModel: string;

  constructor(config: {
    baseURL: string;
    primaryModel: string;
    judgeModel?: string;
    embeddingModel: string;
  }) {
    this.baseURL = config.baseURL;
    this.primaryModel = config.primaryModel;
    this.judgeModel = config.judgeModel;
    this.embeddingModel = config.embeddingModel;
  }

  /**
   * Generate a single response from the primary model
   */
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.primaryModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.message.content,
      model: this.primaryModel,
      timestamp: new Date(),
    };
  }

  /**
   * Stream a response from the primary model
   */
  async chatStream(messages: LLMMessage[]) {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.primaryModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return response.body;
  }

  /**
   * Dual-model query: get responses from both models and select the best
   */
  async dualModelChat(messages: LLMMessage[]): Promise<DualModelResponse> {
    if (!this.judgeModel) {
      // Fall back to single model if no judge model configured
      const response = await this.chat(messages);
      return {
        responses: [response],
        selected: response,
      };
    }

    // Query both models in parallel
    const [primaryResponse, judgeResponse] = await Promise.all([
      this.chat(messages),
      this.chatWithModel(this.judgeModel, messages),
    ]);

    const responses: LLMResponse[] = [primaryResponse, judgeResponse];

    // Use a third model call to judge which response is better
    const judgePrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a judge evaluating two AI responses. Pick the better response based on accuracy, clarity, and helpfulness.

Respond with ONLY a JSON object in this format:
{
  "selected": 0 or 1,
  "reasoning": "brief explanation"
}`,
      },
      {
        role: 'user',
        content: `Original question: ${messages[messages.length - 1].content}

Response A (${this.primaryModel}):
${primaryResponse.content}

Response B (${this.judgeModel}):
${judgeResponse.content}

Which response is better?`,
      },
    ];

    const judgement = await this.chatWithModel(this.judgeModel, judgePrompt);

    try {
      const result = JSON.parse(judgement.content);
      const selectedIndex = result.selected || 0;

      return {
        responses,
        selected: responses[selectedIndex],
        reasoning: result.reasoning,
      };
    } catch (error) {
      // If parsing fails, default to primary model
      return {
        responses,
        selected: responses[0],
        reasoning: 'Failed to parse judge response, defaulting to primary model',
      };
    }
  }

  /**
   * Chat with a specific model
   */
  private async chatWithModel(model: string, messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.message.content,
      model: model,
      timestamp: new Date(),
    };
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseURL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * Test connection to Ollama
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      return [];
    }
  }
}
