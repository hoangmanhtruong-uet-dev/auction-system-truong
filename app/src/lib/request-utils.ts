import { AppErrorCode, isRetryableError } from "@/src/lib/error-codes";
import * as React from "react";

/**
 * Default timeout for API requests in milliseconds.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

/**
 * Generate a unique client request ID for idempotency.
 */
export function generateClientRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
}

/**
 * Check if the client is online.
 */
export function isClientOnline(): boolean {
  return typeof window !== "undefined" ? navigator.onLine : true;
}

/**
 * Listen to online/offline events and return current status.
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  status: "online" | "offline";
} {
  const [status, setStatus] = React.useState<"online" | "offline">(() =>
    typeof window !== "undefined" && navigator.onLine ? "online" : "offline"
  );

  React.useEffect(() => {
    function handleOnline() {
      setStatus("online");
    }

    function handleOffline() {
      setStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline: status === "online",
    status,
  };
}

/**
 * Retry a function with exponential backoff.
 * Only retries for READ operations (idempotent). For mutations, set `retryable = false`.
 */
type ErrorWithCode = Error & { code?: AppErrorCode; status?: number };

function getAppErrorCode(error: unknown): AppErrorCode | undefined {
  if (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: AppErrorCode }).code;
  }

  return undefined;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    retryable?: boolean;
    timeoutMs?: number;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const retryable = options?.retryable ?? true;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await withTimeout(fn, timeoutMs);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Unknown error");

      // Don't retry on auth errors or non-retryable errors
      if (!retryable) {
        throw lastError;
      }

      // Check if the error is retryable
      const isNetworkError =
        lastError.name === "AbortError" ||
        lastError.message.includes("NetworkError") ||
        lastError.message.includes("Failed to fetch");

      const code = getAppErrorCode(err);
      if (!isNetworkError && !(code && isRetryableError(code))) {
        throw lastError;
      }

      // If we've exhausted retries, throw
      if (attempt > maxRetries) {
        throw lastError;
      }

      // Calculate exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt - 1);

      options?.onRetry?.(attempt, lastError, delay);
      await wait(delay);
    }
  }

  // This should never happen, but TypeScript requires it
  throw lastError || new Error("Unexpected retry failure");
}

/**
 * Execute a function with a timeout.
 */
export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    timeoutId = timer;

    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
  });
}

/**
 * Wait for a specified delay (ms).
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a fetch wrapper with timeout, retry, and network check.
 */
export function createAuthenticatedRequest<TResponse = unknown, TBody = unknown>({
  url,
  method = "GET",
  body,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  retryable = true,
  onRetry,
}: {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: TBody;
  timeoutMs?: number;
  retryable?: boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}): Promise<TResponse> {
  return retryWithBackoff(
    async () => {
      // Check network before making request
      if (!isClientOnline()) {
        throw new Error("NETWORK_ERROR");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const options: RequestInit = {
        method,
        headers,
        credentials: "include",
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, { ...options, signal: controller.signal });

        // Handle network errors
        if (!res.ok) {
          let errorData: { code?: AppErrorCode; message?: string } | null = null;

          try {
            errorData = await res.json();
          } catch {
            // Ignore parse errors, use default messages
          }

          const message = errorData?.message || `HTTP ${res.status}: ${res.statusText}`;
          const code = errorData?.code;

          const error = new Error(message) as ErrorWithCode;
          error.code = code;
          error.status = res.status;

          throw error;
        }

        return (await res.json()) as TResponse;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    {
      maxRetries: retryable ? 2 : 0,
      baseDelayMs: 500,
      retryable,
      timeoutMs,
      onRetry,
    }
  );
}

/**
 * Parse error response to AppErrorCode and message.
 */
export function parseErrorResponse(error: Error): {
  code: AppErrorCode;
  message: string;
  isNetworkError: boolean;
} {
  const message = error.message || "Có lỗi xảy ra. Vui lòng thử lại.";
  const isNetworkError =
    error.name === "AbortError" ||
    error.message.includes("NetworkError") ||
    error.message.includes("Failed to fetch") ||
    error.message.includes("timed out");

  // Check if error has code property
  const code = getAppErrorCode(error);
  if (code) {
    return {
      code,
      message,
      isNetworkError: isNetworkError || isRetryableError(code),
    };
  }

  return {
    code: isNetworkError ? "NETWORK_ERROR" : "SERVER_ERROR",
    message,
    isNetworkError,
  };
}