import { createFileRoute } from "@tanstack/react-router";

import { forwardToBackend } from "@/lib/agroshift/backend-proxy";

export const Route = createFileRoute("/api/fields/$fieldId/features")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const fieldId = params.fieldId;
        if (!fieldId || fieldId.length > 200) {
          return Response.json({ error: "invalid_field_id" }, { status: 400 });
        }
        return forwardToBackend(request, `/api/fields/${encodeURIComponent(fieldId)}/features`);
      },
    },
  },
});
