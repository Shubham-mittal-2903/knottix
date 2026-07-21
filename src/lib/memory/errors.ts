export type MemoryErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'NAMESPACE_INVALID'
  | 'ACCESS_DENIED'
  | 'REVISION_CONFLICT'
  | 'VALIDATION_FAILED'
  | 'STORE_UNAVAILABLE'
  | 'SNAPSHOT_NOT_FOUND'
  | 'REFERENCE_INVALID'
  | 'DUPLICATE_ENTRY'
  | 'RESTORE_FAILED';

export class MemoryError extends Error {
  readonly code: MemoryErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: MemoryErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'MemoryError';
    this.code = code;
    this.context = context;
  }

  static entryNotFound(entryId: string): MemoryError {
    return new MemoryError('ENTRY_NOT_FOUND', `Memory entry not found: ${entryId}`, { entryId });
  }

  static namespaceInvalid(namespace: string): MemoryError {
    return new MemoryError('NAMESPACE_INVALID', `Invalid memory namespace: ${namespace}`, { namespace });
  }

  static accessDenied(entryId: string, reason?: string): MemoryError {
    return new MemoryError(
      'ACCESS_DENIED',
      reason ?? `Access denied to memory entry: ${entryId}`,
      { entryId },
    );
  }

  static revisionConflict(entryId: string, expected: number, actual: number): MemoryError {
    return new MemoryError('REVISION_CONFLICT', `Version conflict for entry ${entryId}: expected ${expected}, got ${actual}`, {
      entryId,
      expected,
      actual,
    });
  }

  static validationFailed(message: string, fields?: Record<string, string>): MemoryError {
    return new MemoryError('VALIDATION_FAILED', message, fields ? { fields } : undefined);
  }

  static storeUnavailable(message?: string): MemoryError {
    return new MemoryError('STORE_UNAVAILABLE', message ?? 'Memory store is unavailable');
  }

  static snapshotNotFound(snapshotId: string): MemoryError {
    return new MemoryError('SNAPSHOT_NOT_FOUND', `Snapshot not found: ${snapshotId}`, { snapshotId });
  }

  static referenceInvalid(targetId: string, reason: string): MemoryError {
    return new MemoryError('REFERENCE_INVALID', `Invalid reference to ${targetId}: ${reason}`, { targetId });
  }

  static duplicateEntry(title: string, namespace: string): MemoryError {
    return new MemoryError('DUPLICATE_ENTRY', `Duplicate memory entry: "${title}" in ${namespace}`, { title, namespace });
  }

  static restoreFailed(entryId: string, reason: string): MemoryError {
    return new MemoryError('RESTORE_FAILED', `Cannot restore entry ${entryId}: ${reason}`, { entryId });
  }
}

export function isMemoryError(error: unknown): error is MemoryError {
  return error instanceof MemoryError;
}
