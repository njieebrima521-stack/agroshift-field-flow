import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, Lock, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { describeApiError } from "@/lib/agroshift/api";
import { cn } from "@/lib/utils";

const noticeVariants = cva("flex gap-3 rounded-xl border p-4 text-base", {
  variants: {
    tone: {
      info: "border-primary/15 bg-primary-soft text-primary-strong",
      neutral: "border-border bg-surface text-foreground",
      warning: "border-warning/50 bg-warning-soft text-warning-foreground",
      error: "border-destructive/30 bg-destructive-soft text-destructive",
      success: "border-primary/20 bg-primary-soft text-primary-strong",
      blocked: "border-blocked/30 bg-blocked-soft text-blocked",
    },
  },
  defaultVariants: { tone: "info" },
});

const ICONS = {
  info: Info,
  neutral: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
  blocked: Lock,
};

export function Notice({
  tone = "info",
  title,
  children,
  actions,
  className,
  role,
}: VariantProps<typeof noticeVariants> & {
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const Icon = ICONS[tone ?? "info"];
  return (
    <div className={cn(noticeVariants({ tone }), className)} role={role}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-foreground/85 [&_p]:leading-relaxed">{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 pt-2">{actions}</div>}
      </div>
    </div>
  );
}

export function ApiErrorNotice({
  error,
  onRetry,
  extraAction,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  extraAction?: ReactNode;
  className?: string;
}) {
  const copy = describeApiError(error);
  return (
    <Notice
      tone="error"
      role="alert"
      title={copy.title}
      className={className}
      actions={
        onRetry || extraAction ? (
          <>
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            )}
            {extraAction}
          </>
        ) : undefined
      }
    >
      <p>{copy.detail}</p>
      {copy.issues && copy.issues.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold">Technical details for the team</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-sm">
            {copy.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </details>
      )}
    </Notice>
  );
}
