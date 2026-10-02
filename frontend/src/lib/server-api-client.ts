import { createClient } from "@/shared/api/generated/client";
import { settings } from "@/config/settings";
import { cookies } from "next/headers";

/** SDK fetch receives a Request; cache options must be supplied here. */
export function createServerFetch(next: NextFetchRequestConfig = {}): typeof fetch {
  return async (input, init) => {
    let token: string | undefined;
    try {
      token = (await cookies()).get("access_token")?.value;
    } catch {
      // Build-time calls have no request cookie context.
    }
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    if (token) headers.set("Authorization", `Bearer ${token}`);

    if (headers.has("Authorization") || init?.cache === "no-store" || (input instanceof Request && input.cache === "no-store")) {
      return fetch(input, { ...init, headers, cache: "no-store" });
    }
    return fetch(input, {
      ...init,
      headers,
      next: {
        ...next,
        revalidate: next.revalidate ?? 300,
        tags: Array.from(new Set([...(next.tags ?? []), "api"])),
      },
    });
  };
}

// Keep wire responses unchanged: the API adapters convert them exactly once.
export const serverClient = createClient({
  baseUrl: settings.BACKEND_INTERNAL_URL,
  fetch: createServerFetch(),
});
export default serverClient;
