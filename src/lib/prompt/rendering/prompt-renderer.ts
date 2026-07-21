import type { PromptTemplate, PromptVariableDefinition } from '../types';
import { PromptError } from '../errors';

export interface PromptRenderer {
  render(template: PromptTemplate, variables: Record<string, unknown>): string;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function resolveValue(
  def: PromptVariableDefinition | undefined,
  provided: Record<string, unknown>,
  name: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(provided, name)) {
    return provided[name];
  }
  return def?.defaultValue;
}

export function createPromptRenderer(): PromptRenderer {
  return {
    render(template: PromptTemplate, variables: Record<string, unknown>): string {
      const defsByName = new Map(template.variables.map((v) => [v.name, v]));

      let rendered = template.template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_match, name: string) => {
        const value = resolveValue(defsByName.get(name), variables, name);
        return stringifyValue(value);
      });

      const remaining = rendered.match(/\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\}/);
      if (remaining) {
        throw PromptError.renderFailed(template.key, `Unresolved placeholder: ${remaining[0]}`);
      }

      rendered = rendered.trim();
      return rendered;
    },
  };
}
