import type { AIStreamChunk, TokenUsage } from '../types';

export interface StreamAccumulator {
  push(chunk: AIStreamChunk): void;
  getContent(): string;
  getUsage(): TokenUsage | null;
  isComplete(): boolean;
}

export function createStreamAccumulator(): StreamAccumulator {
  const contentParts: string[] = [];
  let usage: TokenUsage | null = null;
  let complete = false;

  return {
    push(chunk: AIStreamChunk): void {
      switch (chunk.type) {
        case 'content_delta':
          if (chunk.content) {
            contentParts.push(chunk.content);
          }
          break;
        case 'usage':
          if (chunk.usage) {
            usage = chunk.usage;
          }
          break;
        case 'done':
          complete = true;
          if (chunk.usage) {
            usage = chunk.usage;
          }
          break;
        case 'error':
          complete = true;
          break;
      }
    },

    getContent(): string {
      return contentParts.join('');
    },

    getUsage(): TokenUsage | null {
      return usage;
    },

    isComplete(): boolean {
      return complete;
    },
  };
}

export async function collectStream(stream: AsyncIterable<AIStreamChunk>): Promise<{
  content: string;
  usage: TokenUsage | null;
}> {
  const accumulator = createStreamAccumulator();
  for await (const chunk of stream) {
    accumulator.push(chunk);
    if (chunk.type === 'error' && chunk.error) {
      throw new Error(chunk.error);
    }
  }
  return {
    content: accumulator.getContent(),
    usage: accumulator.getUsage(),
  };
}
