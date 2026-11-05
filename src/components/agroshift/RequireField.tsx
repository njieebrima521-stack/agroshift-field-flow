import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/agroshift/session";

import { PageLoading } from "./AppShell";
import { Notice } from "./Notice";

/** Shows an explanation instead of the page when no field has been chosen yet. */
export function RequireField({ children }: { children: ReactNode }) {
  const { state, hydrated } = useSession();
  if (!hydrated) return <PageLoading />;
  if (!state.field) {
    return (
      <Notice
        tone="neutral"
        title="No field selected yet"
        actions={
          <Button asChild>
            <Link to="/field">Choose a field</Link>
          </Button>
        }
      >
        Start by choosing the one field you want to analyse.
      </Notice>
    );
  }
  return <>{children}</>;
}

/** Shows an explanation when no current analysis exists for the inputs. */
export function RequireAnalysis({ children }: { children: ReactNode }) {
  const { state, hydrated, analysisIsCurrent } = useSession();
  if (!hydrated) return <PageLoading />;
  if (!state.field) return <RequireField>{null}</RequireField>;
  if (!state.analysis) {
    return (
      <Notice
        tone="neutral"
        title="No analysis yet"
        actions={
          <>
            <Button asChild>
              <Link to="/analysing">Run the analysis</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/priorities">Check priorities & limits</Link>
            </Button>
          </>
        }
      >
        Results appear here after your field, priorities and limits have been analysed.
      </Notice>
    );
  }
  return (
    <>
      {!analysisIsCurrent && (
        <Notice
          tone="warning"
          className="no-print mb-6"
          title="Your inputs changed after this analysis"
          actions={
            <Button asChild size="sm">
              <Link to="/analysing">Re-run the analysis</Link>
            </Button>
          }
        >
          These results were produced from earlier answers. Re-run to see results for your current field, priorities and limits.
        </Notice>
      )}
      {children}
    </>
  );
}
