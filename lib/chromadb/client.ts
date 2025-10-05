import { ChromaClient, Collection, IEmbeddingFunction } from 'chromadb';
import path from 'path';
import type { Company, TeamMember, DiaryEntry, SearchResult, TimeRange } from '@/lib/types';
import { OllamaClient } from '@/lib/ollama/client';

const CHROMA_PATH = path.join(process.cwd(), 'data', 'chroma');

/**
 * Custom Ollama embedding function for ChromaDB
 */
class OllamaEmbeddingFunction implements IEmbeddingFunction {
  private ollama: OllamaClient;

  constructor(ollamaClient: OllamaClient) {
    this.ollama = ollamaClient;
  }

  async generate(texts: string[]): Promise<number[][]> {
    // Generate embeddings for all texts in parallel
    const embeddings = await Promise.all(
      texts.map(text => this.ollama.generateEmbedding(text))
    );
    return embeddings;
  }
}

export class TeamCardsDB {
  private client: ChromaClient;
  private ollama: OllamaClient;
  private embeddingFunction: OllamaEmbeddingFunction;
  private companiesCollection?: Collection;
  private membersCollection?: Collection;
  private diariesCollection?: Collection;

  constructor(ollamaClient: OllamaClient) {
    // Use the recommended approach instead of deprecated 'path' argument
    this.client = new ChromaClient({
      // For local persistent storage, ChromaDB will use the current directory
      // The path configuration will be handled by the ChromaDB server if needed
    });
    this.ollama = ollamaClient;
    this.embeddingFunction = new OllamaEmbeddingFunction(ollamaClient);
  }

  /**
   * Initialize collections
   */
  async initialize() {
    this.companiesCollection = await this.client.getOrCreateCollection({
      name: 'companies',
      metadata: { 'hnsw:space': 'cosine' },
      embeddingFunction: this.embeddingFunction,
    });

    this.membersCollection = await this.client.getOrCreateCollection({
      name: 'members',
      metadata: { 'hnsw:space': 'cosine' },
      embeddingFunction: this.embeddingFunction,
    });

    this.diariesCollection = await this.client.getOrCreateCollection({
      name: 'diaries',
      metadata: { 'hnsw:space': 'cosine' },
      embeddingFunction: this.embeddingFunction,
    });
  }

  /**
   * Add or update company
   */
  async upsertCompany(company: Company) {
    if (!this.companiesCollection) await this.initialize();

    const text = `${company.name}\nValues: ${company.values}\nThemes: ${company.themes}\nDecision Making: ${company.decisionMaking}\nCulture: ${company.culture}`;
    const embedding = await this.ollama.generateEmbedding(text);

    await this.companiesCollection!.upsert({
      ids: [company.id],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{
        type: 'company',
        companyId: company.id,
        name: company.name,
        updatedAt: company.updatedAt.toISOString(),
      }],
    });
  }

  /**
   * Add or update team member
   */
  async upsertMember(member: TeamMember) {
    if (!this.membersCollection) await this.initialize();

    const text = `${member.name} - ${member.role}
Influence: ${member.influence}
Project Impacts: ${member.projectImpacts}
Superpowers: ${member.superpowers.join(', ')}
Growth Areas: ${member.growthAreas.join(', ')}`;

    const embedding = await this.ollama.generateEmbedding(text);

    await this.membersCollection!.upsert({
      ids: [member.id],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{
        type: 'member',
        companyId: member.companyId,
        memberId: member.id,
        name: member.name,
        role: member.role,
        updatedAt: member.updatedAt.toISOString(),
      }],
    });
  }

  /**
   * Add or update diary entry
   */
  async upsertDiary(entry: DiaryEntry) {
    if (!this.diariesCollection) await this.initialize();

    const embedding = await this.ollama.generateEmbedding(entry.content);

    await this.diariesCollection!.upsert({
      ids: [entry.id],
      embeddings: [embedding],
      documents: [entry.content],
      metadatas: [{
        type: 'diary',
        companyId: entry.companyId,
        memberId: entry.memberId,
        timestamp: entry.timestamp.toISOString(),
        tags: entry.tags?.join(',') || '',
        projects: entry.projects?.join(',') || '',
      }],
    });
  }

  /**
   * Search across all collections
   */
  async search(
    query: string,
    options: {
      companyId?: string;
      memberId?: string;
      timeRange?: TimeRange;
      limit?: number;
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.membersCollection || !this.diariesCollection) {
      await this.initialize();
    }

    const embedding = await this.ollama.generateEmbedding(query);
    const limit = options.limit || 10;
    const results: SearchResult[] = [];

    // Build where filter
    const where: any = {};
    if (options.companyId) {
      where.companyId = options.companyId;
    }
    if (options.memberId) {
      where.memberId = options.memberId;
    }

    // Time range filter
    let timeFilter: Date | undefined;
    if (options.timeRange) {
      const now = new Date();
      switch (options.timeRange) {
        case '1M':
          timeFilter = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case '3M':
          timeFilter = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case '6M':
          timeFilter = new Date(now.setMonth(now.getMonth() - 6));
          break;
        case '1Y':
          timeFilter = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
    }

    // Search members
    const memberResults = await this.membersCollection!.query({
      queryEmbeddings: [embedding],
      nResults: limit,
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    if (memberResults.ids[0]) {
      memberResults.ids[0].forEach((id, idx) => {
        results.push({
          id: id as string,
          content: memberResults.documents[0][idx] as string,
          metadata: {
            type: 'member',
            companyId: (memberResults.metadatas[0][idx] as any).companyId,
            memberId: (memberResults.metadatas[0][idx] as any).memberId,
          },
          score: memberResults.distances?.[0]?.[idx] || 0,
        });
      });
    }

    // Search diaries with time filter
    const diaryWhere = { ...where };
    if (timeFilter) {
      diaryWhere.$gte = { timestamp: timeFilter.toISOString() };
    }

    const diaryResults = await this.diariesCollection!.query({
      queryEmbeddings: [embedding],
      nResults: limit,
      where: Object.keys(diaryWhere).length > 0 ? diaryWhere : undefined,
    });

    if (diaryResults.ids[0]) {
      diaryResults.ids[0].forEach((id, idx) => {
        results.push({
          id: id as string,
          content: diaryResults.documents[0][idx] as string,
          metadata: {
            type: 'diary',
            companyId: (diaryResults.metadatas[0][idx] as any).companyId,
            memberId: (diaryResults.metadatas[0][idx] as any).memberId,
            timestamp: new Date((diaryResults.metadatas[0][idx] as any).timestamp),
          },
          score: diaryResults.distances?.[0]?.[idx] || 0,
        });
      });
    }

    // Sort by score (lower is better for cosine distance)
    return results.sort((a, b) => a.score - b.score);
  }

  /**
   * Get company context
   */
  async getCompanyContext(companyId: string): Promise<string | null> {
    if (!this.companiesCollection) await this.initialize();

    const result = await this.companiesCollection!.get({
      ids: [companyId],
    });

    return result.documents[0] as string || null;
  }

  /**
   * Delete entries by ID
   */
  async delete(type: 'company' | 'member' | 'diary', ids: string[]) {
    if (!this.companiesCollection) await this.initialize();

    const collection =
      type === 'company'
        ? this.companiesCollection!
        : type === 'member'
        ? this.membersCollection!
        : this.diariesCollection!;

    await collection.delete({ ids });
  }
}
