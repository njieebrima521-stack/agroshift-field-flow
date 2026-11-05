/**
 * Forwards this app's /api/* contract routes to the AgroShift backend.
 * Only called from server route handlers. The backend address lives in the
 * server-side AGROSHIFT_BACKEND_URL secret, read per request.
 */
export async function forwardToBackend(request: Request, path: string): Promise<Response> {
  const base = (process.env["AGROSHIFT_BACKEND_URL"] ?? "").trim().replace(/\/+$/, "");
  if (!base) {
    return Response.json(
      {
        error: "backend_not_configured",
        message: "AGROSHIFT_BACKEND_URL is not set, so no AgroShift backend is connected.",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const token = process.env["AGROSHIFT_BACKEND_TOKEN"];
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${base}${path}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      signal: AbortSignal.timeout(85_000),
    });
  } catch (err) {
    console.error(`[AgroShift proxy] ${request.method} ${path} failed`, err);
    return Response.json(
      { error: "backend_unreachable", message: "The AgroShift backend could not be reached." },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
