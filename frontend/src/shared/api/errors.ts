export interface ValidationIssue {
  field: string;
  message: string;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

/** Read both SDK error envelopes and exceptions without trusting their shape. */
export function readApiError(error: unknown, fallback: string, httpStatus?: number) {
  const outer = record(error);
  const inner = outer.error ? record(outer.error) : outer;
  const details = record(inner.details);
  const issues = details.validationErrors ?? details.validation_errors;
  const validationErrors: ValidationIssue[] = Array.isArray(issues)
    ? issues.flatMap((issue: unknown) => {
        const candidate = record(issue);
        return typeof candidate.field === "string" && typeof candidate.message === "string"
          ? [{ field: candidate.field, message: candidate.message }]
          : [];
      })
    : [];
  const status = httpStatus ?? outer.status ?? outer.statusCode ?? (typeof inner.code === "number" ? inner.code : undefined);
  return {
    message: typeof inner.message === "string" ? inner.message : fallback,
    code: typeof inner.code === "string" ? inner.code : undefined,
    status: typeof status === "number" ? status : undefined,
    validationErrors,
  };
}

export class ApiException extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: { validationErrors: ValidationIssue[] },
  ) {
    super(message);
    this.name = "ApiException";
  }
}
