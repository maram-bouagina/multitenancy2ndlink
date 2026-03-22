export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const candidate = error as {
    message?: string;
    response?: {
      data?: {
        error?: string;
        message?: string;
      };
    };
  };

  return candidate.response?.data?.error || candidate.response?.data?.message || candidate.message || fallback;
}