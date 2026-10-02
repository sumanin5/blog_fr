import { settings } from "@/config/settings";

export async function GET() {
  try {
    const response = await fetch(
      `${settings.BACKEND_INTERNAL_URL}/health/ready`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error("Backend unavailable");
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
