import type { PromptTemplate, PromptValidationResult, PromptVariableDefinition } from '../types';

export interface PromptValidator {
  validateVariables(template: PromptTemplate, variables: Record<string, unknown>): PromptValidationResult;
  validateDefinition(template: string, variables: PromptVariableDefinition[]): string[];
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function extractPlaceholders(template: string): Set<string> {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = new RegExp(PLACEHOLDER_PATTERN);
  while ((match = pattern.exec(template)) !== null) {
    found.add(match[1]);
  }
  return found;
}

function validateType(value: unknown, type: PromptVariableDefinition['type']): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

export function createPromptValidator(): PromptValidator {
  return {
    validateVariables(template: PromptTemplate, variables: Record<string, unknown>): PromptValidationResult {
      const missingVariables: string[] = [];
      const errors: string[] = [];

      for (const def of template.variables) {
        const provided = Object.prototype.hasOwnProperty.call(variables, def.name);
        if (!provided) {
          if (def.required && def.defaultValue === undefined) {
            missingVariables.push(def.name);
          }
          continue;
        }
        if (!validateType(variables[def.name], def.type)) {
          errors.push(`Variable "${def.name}" expected type ${def.type}`);
        }
      }

      const definedNames = new Set(template.variables.map((v) => v.name));
      const unknownVariables = Object.keys(variables).filter((k) => !definedNames.has(k));

      return {
        valid: missingVariables.length === 0 && errors.length === 0,
        missingVariables,
        unknownVariables,
        errors,
      };
    },

    validateDefinition(template: string, variables: PromptVariableDefinition[]): string[] {
      const errors: string[] = [];
      const names = new Set<string>();

      for (const def of variables) {
        if (names.has(def.name)) {
          errors.push(`Duplicate variable definition: ${def.name}`);
        }
        names.add(def.name);
      }

      const placeholders = extractPlaceholders(template);
      for (const placeholder of placeholders) {
        if (!names.has(placeholder)) {
          errors.push(`Template references undefined variable: ${placeholder}`);
        }
      }

      return errors;
    },
  };
}
