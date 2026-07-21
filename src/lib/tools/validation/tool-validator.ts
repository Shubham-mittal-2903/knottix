import type { ToolDefinition, ToolInputValidationResult, ToolParameterDefinition } from '../types';

export interface ToolValidator {
  validateDefinition(parameters: ToolParameterDefinition[]): string[];
  validateInput(tool: ToolDefinition, input: Record<string, unknown>): ToolInputValidationResult;
}

function validateType(value: unknown, type: ToolParameterDefinition['type']): boolean {
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

export function createToolValidator(): ToolValidator {
  return {
    validateDefinition(parameters: ToolParameterDefinition[]): string[] {
      const errors: string[] = [];
      const names = new Set<string>();

      for (const param of parameters) {
        if (names.has(param.name)) {
          errors.push(`Duplicate parameter definition: ${param.name}`);
        }
        names.add(param.name);

        if (param.enum && param.type !== 'string') {
          errors.push(`Parameter "${param.name}" has enum but type is not "string"`);
        }
      }

      return errors;
    },

    validateInput(tool: ToolDefinition, input: Record<string, unknown>): ToolInputValidationResult {
      const missingParameters: string[] = [];
      const errors: string[] = [];

      for (const param of tool.parameters) {
        const provided = Object.prototype.hasOwnProperty.call(input, param.name);

        if (!provided) {
          if (param.required && param.defaultValue === undefined) {
            missingParameters.push(param.name);
          }
          continue;
        }

        const value = input[param.name];
        if (!validateType(value, param.type)) {
          errors.push(`Parameter "${param.name}" expected type ${param.type}`);
          continue;
        }

        if (param.enum && typeof value === 'string' && !param.enum.includes(value)) {
          errors.push(`Parameter "${param.name}" must be one of: ${param.enum.join(', ')}`);
        }
      }

      const definedNames = new Set(tool.parameters.map((p) => p.name));
      const unknownParameters = Object.keys(input).filter((k) => !definedNames.has(k));

      return {
        valid: missingParameters.length === 0 && errors.length === 0,
        missingParameters,
        unknownParameters,
        errors,
      };
    },
  };
}
