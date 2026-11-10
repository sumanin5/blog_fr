import { createClient } from "@/shared/api/generated/client";
import { settings } from "@/config/settings";
import { cookies } from "next/headers";

function mergeHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers;
}

/**
 * Public, cacheable server fetch. SDK fetch receives a Request; cache options must be supplied here.
 *
 * Never reads cookies: calling cookies() opts the whole route into dynamic rendering,
 * which silently disables ISR for every public page. Use createAuthServerFetch for
 * calls that need the visitor's identity.
 */
export function createServerFetch(next: NextFetchRequestConfig = {}): typeof fetch {
  return async (input, init) => {
    const headers = mergeHeaders(input, init);

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

/** Authenticated server fetch: forwards the access_token cookie and never caches. */
export function createAuthServerFetch(): typeof fetch {
  return async (input, init) => {
    const headers = mergeHeaders(input, init);
    const token = (await cookies()).get("access_token")?.value;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers, cache: "no-store" });
  };
}

// Keep wire responses unchanged: the API adapters convert them exactly once.
export const serverClient = createClient({
  baseUrl: settings.BACKEND_INTERNAL_URL,
  fetch: createServerFetch(),
});
export default serverClient;
