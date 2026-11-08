import { Link, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  Home,
  LayoutGrid,
  Leaf,
  MapPin,
  Menu,
  RotateCcw,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from "@/lib/agroshift/session";
import { cn } from "@/lib/utils";

import { Logo } from "./Logo";

type NavItem = { to: string; label: string; icon: LucideIcon; match: string[] };

const NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: Home, match: [] },
  { to: "/field", label: "Choose a Field", icon: MapPin, match: ["/field"] },
  { to: "/details", label: "Field Details", icon: FileText, match: ["/details"] },
  { to: "/priorities", label: "Priorities & Limits", icon: SlidersHorizontal, match: ["/priorities"] },
  { to: "/evidence", label: "Analysis", icon: Leaf, match: ["/analysing", "/evidence"] },
  { to: "/options", label: "Results", icon: LayoutGrid, match: ["/options", "/strategy", "/compare"] },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Analysis steps">
      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-4 text-base transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-surface",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SessionFooter({ onDone }: { onDone?: () => void }) {
  const { reset } = useSession();
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-3 border-t border-sidebar-border pt-4">
      <p className="text-sm text-muted-foreground">
        No account needed. Your answers stay in this browser tab only.
      </p>
      {confirming ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Clear this field and all answers?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reset();
                setConfirming(false);
                onDone?.();
              }}
            >
              Yes, clear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="-ml-2" onClick={() => setConfirming(true)}>
          <RotateCcw aria-hidden /> Start a new analysis
        </Button>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[16rem_minmax(0,1fr)] print:block">
      <aside className="no-print sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
        <Link to="/" className="mb-8 px-2" aria-label="AgroShift home">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <SessionFooter />
      </aside>

      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
        <Link to="/" aria-label="AgroShift home">
          <Logo className="w-24" />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-5">
            <SheetTitle className="sr-only">AgroShift menu</SheetTitle>
            <Logo className="mb-6 w-32" />
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <SessionFooter onDone={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-w-0 px-4 pb-10 pt-6 sm:px-8 md:pt-10 lg:px-12 print:p-0">{children}</main>
    </div>
  );
}

export function PageHeader({ step, title, subtitle }: { step?: string; title: string; subtitle?: ReactNode }) {
  return (
    <header className="no-print mb-8 border-b border-border pb-6">
      {step && <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{step}</p>}
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function StepNav({ back, next }: { back?: ReactNode; next?: ReactNode }) {
  return (
    <div className="no-print mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>{back}</div>
      <div className="flex flex-col gap-3 sm:flex-row">{next}</div>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
