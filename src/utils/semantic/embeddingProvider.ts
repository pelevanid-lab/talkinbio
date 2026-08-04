import { embed, embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

export interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  async embedQuery(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: googleProvider.textEmbeddingModel('gemini-embedding-001'),
      value: text,
    });
    return embedding;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const { embeddings } = await embedMany({
      model: googleProvider.textEmbeddingModel('gemini-embedding-001'),
      values: texts,
    });
    return embeddings;
  }
}

export class CloudflareEmbeddingProvider implements EmbeddingProvider {
  private accountId: string;
  private apiToken: string;
  private model: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.model = process.env.CLOUDFLARE_EMBEDDING_MODEL || '@cf/baai/bge-m3';
  }

  async embedQuery(text: string): Promise<number[]> {
    const results = await this.embedDocuments([text]);
    return results[0];
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!this.accountId || !this.apiToken) {
      throw new Error('Cloudflare Workers AI credentials are not configured.');
    }
    if (texts.length === 0) return [];

    let attempt = 0;
    const maxAttempts = 3;
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: texts }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Cloudflare AI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(`Cloudflare AI error: ${JSON.stringify(data.errors)}`);
        }

        const embeddings = data.result?.data;
        if (!embeddings || !Array.isArray(embeddings)) {
          throw new Error('Invalid embeddings format in Cloudflare response.');
        }

        return embeddings;
      } catch (err: any) {
        if (attempt >= maxAttempts) {
          throw err;
        }
        await delay(1000 * attempt); // exponential retry backoff
      }
    }
    throw new Error('Failed to generate embeddings after retries.');
  }
}

// For unit testing and offline development
export class FakeEmbeddingProvider implements EmbeddingProvider {
  async embedQuery(text: string): Promise<number[]> {
    const q = text.toLowerCase();
    const vec = new Array(1024).fill(0).map(() => Math.random() * 0.01);
    
    if (q.includes('randevu') || q.includes('rezervasyon') || q.includes('seans')) {
      vec[0] = 0.95; // High booking coordinate
    } else if (q.includes('egitim') || q.includes('kurs') || q.includes('ogren')) {
      vec[1] = 0.95; // High learning coordinate
    } else if (q.includes('fiyat') || q.includes('ucret') || q.includes('odeme')) {
      vec[2] = 0.95; // High pricing coordinate
    } else if (q.includes('whatsapp') || q.includes('telefon') || q.includes('iletisim')) {
      vec[3] = 0.95; // High contact coordinate
    } else if (q.includes('erkek') || q.includes('hizmet')) {
      vec[4] = 0.95; // High gender / general Q&A coordinate
    }
    
    // Normalize vector
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map((v) => v / norm);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedQuery(t)));
  }
}
