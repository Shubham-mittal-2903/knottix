import type { PromptContextBlock } from '../types';

const DEFAULT_MAX_CONTEXT_TOKENS = 2000;
const CHARS_PER_TOKEN_ESTIMATE = 4;

export interface ContextInjector {
  buildContextBlock(blocks: PromptContextBlock[], maxTokens?: number): string;
  inject(content: string, blocks: PromptContextBlock[], maxTokens?: number): string;
  estimateTokens(text: string): number;
}

export function createContextInjector(): ContextInjector {
  function estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
  }

  function buildContextBlock(blocks: PromptContextBlock[], maxTokens: number = DEFAULT_MAX_CONTEXT_TOKENS): string {
    const allEntries = blocks.flatMap((block) => block.entries);
    if (allEntries.length === 0) return '';

    const lines: string[] = ['[RELEVANT CONTEXT]'];
    let tokenBudget = maxTokens;

    for (const entry of allEntries) {
      const line = `- (${entry.date}, ${entry.sourceType}) ${entry.content}`;
      const lineTokens = estimateTokens(line);
      if (lineTokens > tokenBudget) break;
      lines.push(line);
      tokenBudget -= lineTokens;
    }

    lines.push('[END CONTEXT]');
    return lines.join('\n');
  }

  return {
    buildContextBlock,
    estimateTokens,

    inject(content: string, blocks: PromptContextBlock[], maxTokens?: number): string {
      const contextBlock = buildContextBlock(blocks, maxTokens);
      if (!contextBlock) return content;
      return `${contextBlock}\n\n${content}`;
    },
  };
}
