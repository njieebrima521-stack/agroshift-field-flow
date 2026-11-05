import { createFileRoute } from "@tanstack/react-router";

import { forwardToBackend } from "@/lib/agroshift/backend-proxy";

export const Route = createFileRoute("/api/strategies")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const length = Number(request.headers.get("content-length") ?? "0");
        if (length > 64_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
        return forwardToBackend(request, "/api/strategies");
      },
    },
  },
});
