import { createFileRoute } from "@tanstack/react-router";

import { forwardToBackend } from "@/lib/agroshift/backend-proxy";

export const Route = createFileRoute("/api/fields")({
  server: {
    handlers: {
      GET: async ({ request }) => forwardToBackend(request, "/api/fields"),
    },
  },
});
