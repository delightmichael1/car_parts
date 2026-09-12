interface ApiErrorShape {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: { message?: string };
    };
  };
}

export function apiErrorDetails(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const err = error as ApiErrorShape;
    return {
      code: err.code,
      status: err.response?.status,
      message:
        err.response?.data?.error?.message ??
        err.response?.data?.message ??
        err.message,
    };
  }
  return { code: undefined, status: undefined, message: undefined };
}

export function apiErrorMessage(error: unknown, fallback: string) {
  return apiErrorDetails(error).message || fallback;
}