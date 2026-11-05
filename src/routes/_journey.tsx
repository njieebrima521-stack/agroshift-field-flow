import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/agroshift/AppShell";

export const Route = createFileRoute("/_journey")({
  component: JourneyLayout,
});

function JourneyLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
