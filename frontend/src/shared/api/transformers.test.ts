import { describe, expect, it } from "vitest";
import { normalizeApiResponse, denormalizeApiRequest } from "./transformers";
import { toSnakeCase } from "./helpers";

describe("API key conversion", () => {
  it("converts nested arrays and nullable fields", () => {
    const wire = { cover_media: { original_filename: "cover.png" }, items: [{ post_type: "articles" }], parent_id: null };
    const domain = normalizeApiResponse(wire);
    expect(domain).toEqual({ coverMedia: { originalFilename: "cover.png" }, items: [{ postType: "articles" }], parentId: null });
    expect(toSnakeCase(domain)).toEqual(wire);
  });
  it("preserves uploads and other native objects", () => {
    const file = new File(["image"], "cover.png");
    const form = new FormData();
    form.append("file", file);
    const blob = new Blob(["image"]);
    const date = new Date("2025-01-01");
    const result = toSnakeCase({ coverFile: file, formData: form, imageBlob: blob, createdAt: date });
    expect(result.cover_file).toBe(file);
    expect(result.form_data).toBe(form);
    expect(result.image_blob).toBe(blob);
    expect(result.created_at).toBe(date);
    expect(denormalizeApiRequest(null)).toBeNull();
  });
});
