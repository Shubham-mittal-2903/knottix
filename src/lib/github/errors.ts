export class GitHubApiError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.endpoint = endpoint;
  }
}

export function isGitHubApiError(error: unknown): error is GitHubApiError {
  return error instanceof GitHubApiError;
}
