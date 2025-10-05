// Core types for TeamCards

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface Company {
  id: string;
  name: string;
  values: string;
  themes: string;
  decisionMaking: string;
  culture: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  influence: string;
  projectImpacts: string;
  superpowers: string[];
  growthAreas: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DiaryEntry {
  id: string;
  memberId: string;
  companyId: string;
  content: string;
  timestamp: Date;
  tags?: string[];
  projects?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  ollama: {
    host: string;
    primaryModel: string;
    judgeModel?: string;
    embeddingModel: string;
  };
  mcp: {
    servers: MCPServer[];
  };
  features: {
    dualModelEnabled: boolean;
    defaultTimeRange: TimeRange;
  };
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  timestamp: Date;
}

export interface DualModelResponse {
  responses: LLMResponse[];
  selected: LLMResponse;
  reasoning?: string;
}

export interface QueryContext {
  companyId?: string;
  memberId?: string;
  timeRange?: TimeRange;
  includeCompanyContext?: boolean;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: {
    type: 'company' | 'member' | 'diary';
    companyId: string;
    memberId?: string;
    timestamp?: Date;
  };
  score: number;
}
