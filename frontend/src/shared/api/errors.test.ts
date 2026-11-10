import { describe, expect, it } from "vitest";
import { ApiException, readApiError } from "./errors";

describe("API error boundary", () => {
  it("keeps HTTP status distinct from the application error code", () => {
    expect(readApiError({ error: { code: "NOT_FOUND", message: "missing" } }, "fallback", 404))
      .toMatchObject({ status: 404, code: "NOT_FOUND", message: "missing" });
  });
  it("reads validation issues in both wire and normalized responses", () => {
    const issues = [{ field: "title", message: "required" }, null, { field: 1 }];
    for (const key of ["validation_errors", "validationErrors"]) {
      expect(readApiError({ error: { details: { [key]: issues } } }, "fallback").validationErrors)
        .toEqual([{ field: "title", message: "required" }]);
    }
  });
  it("preserves validation details when the interceptor throws", () => {
    const error = new ApiException("invalid", "VALIDATION_ERROR", 422, {
      validationErrors: [{ field: "username", message: "required" }],
    });
    expect(readApiError(error, "fallback")).toMatchObject({
      message: "invalid", status: 422, validationErrors: [{ field: "username", message: "required" }],
    });
  });
  it("handles malformed errors and network exceptions", () => {
    expect(readApiError(null, "fallback").message).toBe("fallback");
    expect(readApiError({ error: "bad" }, "fallback").message).toBe("fallback");
    expect(readApiError(new Error("offline"), "fallback").message).toBe("offline");
  });
});
