import { createHash } from "crypto";
import { prisma } from "@/src/lib/prisma";
import { DEFAULT_ERROR_MESSAGES, error, type ErrorResult, type ActionResult, type AppErrorCode } from "@/src/lib/error-codes";

/**
 * Log error details to console/file for debugging
 * Never expose full error details to client in production
 */
export function logError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const isError = error instanceof Error;
  const stack = isError ? error.stack : undefined;
  const message = isError ? error.message : String(error);

  // Generate request ID for traceability
  const requestId = generateTraceId();

  const logData = {
    timestamp: new Date().toISOString(),
    requestId,
    context,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : stack,
    extra: extra || {},
  };

  console.error("[ERROR]", JSON.stringify(logData, null, 2));
}

/**
 * Generate a short trace ID for request tracking
 */
function generateTraceId(): string {
  return createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .substring(0, 8);
}

/**
 * Standardized error response generator
 * - Sanitizes error details for production
 * - Maps codes to user-friendly messages
 * - Logs error for debugging
 */
export function createErrorResponse(
  code: AppErrorCode,
  userMessage?: string,
  extra?: {
    fieldErrors?: Record<string, string>;
    details?: unknown;
    context?: string;
  },
): ErrorResult {
  const context = extra?.context || "unknown";

  // Log error for debugging (in production, stack is omitted)
  logError(context, extra?.details || userMessage, {
    code,
    extraDetails: extra?.details,
  });

  return error(code, userMessage || DEFAULT_ERROR_MESSAGES[code], {
    fieldErrors: extra?.fieldErrors,
    details: process.env.NODE_ENV === "production" ? undefined : extra?.details,
  });
}

/**
 * Check if result is an error by looking at both `ok` and `success` properties
 */
function isErrorNotOk(result: ActionResult<unknown>): result is ErrorResult {
  // Check new-style first
  if ("ok" in result && result.ok !== undefined && !result.ok) return true;
  // Fallback to legacy-style
  if ("success" in result && result.success !== undefined && !result.success) return true;
  return false;
}

/**
 * Extract the error code from a result object (handles both legacy and new formats)
 */
export function getErrorCode(result: ActionResult<unknown>): AppErrorCode | null {
  if (!result) return null;
  if (!isErrorNotOk(result)) return null;
  // At this point we know we have an error result
  if ("code" in result && result.code) return result.code as AppErrorCode;
  // Legacy format may use `code` at top level
  return null;
}

/**
 * Check if result is an error
 */
export function isErrorResult(result: ActionResult<unknown>): result is ErrorResult {
  if (!result) return false;
  if ("ok" in result && result.ok !== undefined && !result.ok) return true;
  if ("success" in result && result.success !== undefined && !result.success) return true;
  return false;
}

/**
 * Get user-friendly error message from result (handles both legacy and new formats)
 */
export function getErrorMessage(result: ActionResult<unknown>): string {
  if (!result) return "";
  if (!isErrorResult(result)) return "";
  // Try message first (new format), fallback to error (legacy format)
  if ("message" in result && result.message) return result.message as string;
  if ("error" in result && result.error) return result.error as string;
  return "";
}

/**
 * Format validation errors for form fields
 */
export function formatValidationErrors(errors: Record<string, string | { _errors?: string[] }>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const [field, message] of Object.entries(errors)) {
    if (typeof message === "string") {
      fieldErrors[field] = message;
    } else if (message?._errors && Array.isArray(message._errors)) {
      fieldErrors[field] = message._errors[0] || "Giá trị không hợp lệ";
    }
  }

  return fieldErrors;
}

/**
 * Handle Prisma errors and map to app-specific codes
 */
export function mapPrismaError(error: unknown): { code: AppErrorCode; details?: unknown } {
  const prismaError = error as { code?: string; meta?: { target?: string[] }; message?: string; name?: string };

  const message = prismaError.message ?? "";

  // Check for unique constraint violations
  if (prismaError.code === "P2002") {
    const target = prismaError.meta?.target?.[0] || "field";
    return { code: "CONFLICT", details: { constraint: target } };
  }

  // Check for record not found
  if (prismaError.code === "P2025") {
    return { code: "NOT_FOUND" };
  }

  // Check for validation error
  if (prismaError.code === "P2000" || prismaError.code === "P2014" || prismaError.code === "P2015") {
    return { code: "VALIDATION_ERROR" };
  }

  // Check for constraint violation
  if (prismaError.code === "P2003") {
    return { code: "CONFLICT" };
  }

  // Null constraint / invalid value / invalid enum / schema mismatch
  if (prismaError.code === "P2011" || prismaError.code === "P2005" || prismaError.code === "P2006" || prismaError.code === "P2022") {
    return { code: "VALIDATION_ERROR", details: error };
  }

  // Transaction conflict/deadlock/serialization failure
  if (prismaError.code === "P2034" || message.includes("could not serialize access") || message.includes("deadlock detected")) {
    return { code: "CONCURRENT_BID_CONFLICT", details: error };
  }

  // Timeout / unavailable / pool exhausted
  if (
    prismaError.code === "P1001" ||
    prismaError.code === "P1002" ||
    prismaError.code === "P2024" ||
    prismaError.code === "P3018" ||
    prismaError.code === "P3019" ||
    message.includes("Timed out") ||
    message.includes("connection pool")
  ) {
    return { code: "DATABASE_ERROR", details: error };
  }

  return { code: "DATABASE_ERROR", details: error };
}

export function normalizeError(
  err: unknown,
  context = "server-action",
  fallbackCode: AppErrorCode = "SERVER_ERROR",
  fallbackMessage?: string,
): ErrorResult {
  if (isErrorResult(err as ActionResult<unknown>)) {
    return err as ErrorResult;
  }

  const mapped = mapPrismaError(err);
  const code = mapped.code || fallbackCode;
  const message = fallbackMessage || DEFAULT_ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGES[fallbackCode];

  logError(context, err, { code });

  return error(code, message, {
    details: process.env.NODE_ENV === "production" ? undefined : mapped.details,
  });
}

/**
 * Handle network errors (fetch, external APIs)
 */
export function mapNetworkError(err: unknown): ErrorResult {
  const errorMessage = err instanceof Error ? err.message : String(err);

  if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND") || errorMessage.includes("ETIMEDOUT")) {
    return error("NETWORK_ERROR", DEFAULT_ERROR_MESSAGES.NETWORK_ERROR, {
      details: err,
    });
  }

  return error("NETWORK_ERROR", DEFAULT_ERROR_MESSAGES.NETWORK_ERROR, {
    details: err,
  });
}

/**
 * Creates a success result in both old and new formats
 */
export function createSuccessResponse<T>(data: T, message?: string): { ok: true; success: true; data: T; message?: string } {
  return {
    ok: true,
    success: true,
    data,
    ...(message ? { message } : {}),
  };
}