import type { WorkflowStepDefinition } from '@/lib/workflows';

export function step(
  id: string,
  name: string,
  type: WorkflowStepDefinition['type'],
  config: Record<string, unknown>,
  onSuccess?: string,
  onFailure?: string,
): WorkflowStepDefinition {
  return { id, name, type, config, onSuccess, onFailure };
}

export function extractQuoted(text: string): string | null {
  const m = text.match(/["“]([^"”]+)["”]/) ?? text.match(/'([^']+)'/);
  return m ? m[1].trim() : null;
}

export function extractProjectPath(text: string): string | null {
  const quoted = extractQuoted(text);
  if (quoted) return quoted;
  const winPath = text.match(/[a-zA-Z]:\\[^\s"]+/);
  if (winPath) return winPath[0];
  const relPath = text.match(/(?:\.{1,2}[\\/])[^\s"]+/);
  return relPath ? relPath[0] : null;
}

export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
}

export function extractAfterKeyword(text: string, keywords: string[]): string | null {
  const pattern = new RegExp(`\\b(?:${keywords.join('|')})\\s+(.+)$`, 'i');
  const m = text.match(pattern);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '') || null;
}
