import { AIError } from '../errors';

export interface CancellationHandle {
  signal: AbortSignal;
  cancel(): void;
}

export function createCancellationHandle(): CancellationHandle {
  const controller = new AbortController();

  return {
    signal: controller.signal,
    cancel(): void {
      controller.abort();
    },
  };
}

export function checkCancellation(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw AIError.cancelled();
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, providerId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(AIError.timeout(providerId, timeoutMs));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
