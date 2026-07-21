import type { AIMessage, AIRequest, AIResponse, AIStreamChunk, ProviderConfig, TokenUsage } from '../types';
import type { AIProvider } from './types';
import { AIError } from '../errors';

const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_BASE_URL = 'https://api.anthropic.com';

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessageResponse {
  id: string;
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

interface AnthropicErrorResponse {
  type: 'error';
  error: { type: string; message: string };
}

function splitMessages(messages: AIMessage[]): { system: string | undefined; rest: Array<{ role: 'user' | 'assistant'; content: string }> } {
  const systemParts: string[] = [];
  const rest: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content);
    } else {
      rest.push({ role: message.role, content: message.content });
    }
  }

  return { system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined, rest };
}

function mapFinishReason(stopReason: string | null): AIResponse['finishReason'] {
  switch (stopReason) {
    case 'end_turn':
    case 'stop_sequence':
    case 'tool_use':
      return 'stop';
    case 'max_tokens':
      return 'length';
    default:
      return 'stop';
  }
}

function mapErrorResponse(providerId: string, status: number, body: AnthropicErrorResponse | null): AIError {
  const message = body?.error?.message ?? `Anthropic request failed with status ${status}`;
  const type = body?.error?.type;

  if (status === 401 || type === 'authentication_error') return AIError.authFailed(providerId);
  if (status === 429 || type === 'rate_limit_error') return AIError.rateLimited(providerId);
  if (type === 'overloaded_error') return AIError.providerUnavailable(providerId, message);
  if (status === 400 || type === 'invalid_request_error') return AIError.invalidRequest(message);
  return AIError.providerError(providerId, message);
}

function buildRequestBody(request: AIRequest, stream: boolean): Record<string, unknown> {
  const { system, rest } = splitMessages(request.messages);

  return {
    model: request.model,
    max_tokens: request.maxTokens ?? 4096,
    messages: rest,
    ...(system ? { system } : {}),
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.topP !== undefined ? { top_p: request.topP } : {}),
    ...(request.stop && request.stop.length > 0 ? { stop_sequences: request.stop } : {}),
    stream,
  };
}

function toUsage(usage: { input_tokens: number; output_tokens: number }): TokenUsage {
  return {
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
  };
}

function parseSseEvents(raw: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = raw.split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (data) events.push({ event, data });
  }

  return events;
}

export function createAnthropicProvider(config: ProviderConfig): AIProvider {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;

  function apiKey(): string | undefined {
    return process.env[config.apiKeyEnvVar];
  }

  async function request(request: AIRequest, stream: boolean): Promise<Response> {
    const key = apiKey();
    if (!key) throw AIError.authFailed(config.id);

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(buildRequestBody(request, stream)),
      signal: request.signal,
    });

    if (!response.ok) {
      let body: AnthropicErrorResponse | null = null;
      try {
        body = (await response.json()) as AnthropicErrorResponse;
      } catch {
        body = null;
      }
      throw mapErrorResponse(config.id, response.status, body);
    }

    return response;
  }

  return {
    id: config.id,
    name: config.name,
    config,

    isAvailable(): boolean {
      return Boolean(apiKey());
    },

    async complete(aiRequest: AIRequest): Promise<AIResponse> {
      let response: Response;
      try {
        response = await request(aiRequest, false);
      } catch (error) {
        if (error instanceof AIError) throw error;
        if (error instanceof Error && error.name === 'AbortError') throw AIError.cancelled();
        throw AIError.providerError(config.id, error instanceof Error ? error.message : String(error));
      }

      const body = (await response.json()) as AnthropicMessageResponse;
      const content = body.content
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('');

      return {
        requestId: aiRequest.requestId,
        model: body.model,
        providerId: config.id,
        content,
        finishReason: mapFinishReason(body.stop_reason),
        usage: toUsage(body.usage),
        latencyMs: 0,
      };
    },

    async *stream(aiRequest: AIRequest): AsyncIterable<AIStreamChunk> {
      let response: Response;
      try {
        response = await request(aiRequest, true);
      } catch (error) {
        const aiError =
          error instanceof AIError
            ? error
            : AIError.providerError(config.id, error instanceof Error ? error.message : String(error));
        yield { type: 'error', error: aiError.message };
        return;
      }

      if (!response.body) {
        yield { type: 'error', error: 'Anthropic response had no body to stream' };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let inputTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lastBoundary = buffer.lastIndexOf('\n\n');
          if (lastBoundary === -1) continue;

          const ready = buffer.slice(0, lastBoundary);
          buffer = buffer.slice(lastBoundary + 2);

          for (const { event, data } of parseSseEvents(ready)) {
            if (data === '[DONE]') continue;
            const parsed = JSON.parse(data) as Record<string, unknown>;

            if (event === 'message_start') {
              const message = parsed.message as { usage?: { input_tokens: number } } | undefined;
              inputTokens = message?.usage?.input_tokens ?? 0;
            } else if (event === 'content_block_delta') {
              const delta = parsed.delta as { type: string; text?: string } | undefined;
              if (delta?.type === 'text_delta' && delta.text) {
                yield { type: 'content_delta', content: delta.text };
              }
            } else if (event === 'message_delta') {
              const usage = parsed.usage as { output_tokens: number } | undefined;
              const delta = parsed.delta as { stop_reason?: string | null } | undefined;
              if (usage) {
                yield {
                  type: 'usage',
                  usage: toUsage({ input_tokens: inputTokens, output_tokens: usage.output_tokens }),
                  finishReason: mapFinishReason(delta?.stop_reason ?? null),
                };
              }
            } else if (event === 'error') {
              const errBody = parsed as unknown as AnthropicErrorResponse;
              yield { type: 'error', error: errBody.error?.message ?? 'Unknown streaming error' };
            }
          }
        }

        yield { type: 'done' };
      } catch (error) {
        yield { type: 'error', error: error instanceof Error ? error.message : String(error) };
      } finally {
        reader.releaseLock();
      }
    },
  };
}
