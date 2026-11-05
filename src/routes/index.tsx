import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Loader2, Play, ShieldCheck, Sprout, Satellite } from "lucide-react";
import { useState } from "react";

import { FieldIllustration } from "@/components/agroshift/FieldIllustration";
import { Logo } from "@/components/agroshift/Logo";
import { ApiErrorNotice, Notice } from "@/components/agroshift/Notice";
import { Button } from "@/components/ui/button";
import { getFields } from "@/lib/agroshift/api";
import { useSession } from "@/lib/agroshift/session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgroShift — Explore crop rotations for your field" },
      {
        name: "description",
        content:
          "AgroShift uses NASA Earth observations, local soil information and your priorities to compare crop-rotation options for one field in The Gambia.",
      },
      { property: "og:title", content: "AgroShift — From Data to Better Harvests" },
      {
        property: "og:description",
        content: "Compare your current crop rotation with two alternatives, and see where the evidence runs out.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

export const LANDING_MESSAGE =
  "Satellite data helps us describe the conditions around a field, not measure inside it. This tool compares rotation options and shows where the evidence runs out.";

const FEATURES = [
  { icon: Satellite, title: "NASA", text: "Earth observations" },
  { icon: Sprout, title: "Crop rotation", text: "options to compare" },
  { icon: BarChart3, title: "Local soil", text: "information" },
  { icon: ShieldCheck, title: "Built for farmers", text: "no sign-up needed" },
];

function Landing() {
  const navigate = useNavigate();
  const { selectField } = useSession();
  const [loadingExample, setLoadingExample] = useState(false);
  const [exampleError, setExampleError] = useState<unknown>(null);
  const [noFields, setNoFields] = useState(false);

  async function loadExample() {
    setLoadingExample(true);
    setExampleError(null);
    setNoFields(false);
    try {
      const fields = await getFields();
      if (fields.length === 0) {
        setNoFields(true);
        return;
      }
      // The example is the first field record returned by the backend.
      selectField(fields[0]);
      navigate({ to: "/field" });
    } catch (err) {
      setExampleError(err);
    } finally {
      setLoadingExample(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-border py-4">
          <Logo className="w-32 sm:w-40" />
        </header>

        <main className="grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
          <section>
            <p className="inline-block rounded-full bg-primary-soft px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-primary-strong">
              From data to better harvests
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-primary-strong sm:text-5xl lg:text-6xl">
              Smarter Decisions.
              <br />
              Healthier <span className="text-highlight">Farms.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Use NASA satellite data and local insights to explore crop rotation strategies for a more resilient
              and productive field.
            </p>
            <p className="mt-4 max-w-xl rounded-xl border-l-4 border-highlight bg-surface p-4 text-base text-foreground">
              {LANDING_MESSAGE}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/field">
                  Analyse My Farm <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={loadExample} disabled={loadingExample}>
                {loadingExample ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
                {loadingExample ? "Loading example field…" : "See an Example Field"}
              </Button>
            </div>

            <div className="mt-4 space-y-3" aria-live="polite">
              {exampleError !== null && <ApiErrorNotice error={exampleError} onRetry={loadExample} />}
              {noFields && (
                <Notice tone="warning" title="No example field available">
                  The AgroShift service returned no field records, so there is no example to show yet.
                </Notice>
              )}
            </div>
          </section>

          <FieldIllustration />
        </main>

        <section aria-label="What AgroShift uses" className="grid grid-cols-2 gap-4 rounded-2xl bg-surface p-5 sm:p-6 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </section>

        <footer className="py-8 text-sm text-muted-foreground">
          AgroShift supports your judgement. It does not replace your own experience or local agricultural advice.
          NASA Space Apps Challenge 2026.
        </footer>
      </div>
    </div>
  );
}
