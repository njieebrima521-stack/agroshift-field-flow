import { ChevronDown } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function FieldLabel({ htmlFor, children, optional }: { htmlFor?: string; children: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-base font-medium text-foreground">
      {children}
      {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
    </label>
  );
}

export function ErrorText({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-destructive">
      {children}
    </p>
  );
}

export function HelpText({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>;
}

export const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-destructive";

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(inputClass, "appearance-none pr-10", className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  );
}

export type SegmentOption = { value: string; label: string; hint?: string };

/** Accessible single-choice segmented control (radio group). */
export function Segmented({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  description,
}: {
  name: string;
  legend: string;
  options: SegmentOption[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  description?: string;
}) {
  return (
    <fieldset aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1.5 text-base font-medium text-foreground">{legend}</legend>
      {description && <p className="-mt-0.5 mb-2 text-sm text-muted-foreground">{description}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-base transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                checked
                  ? "border-primary bg-primary-soft font-semibold text-primary-strong"
                  : "border-input bg-background hover:bg-surface",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="size-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="block">{o.label}</span>
                {o.hint && <span className="block text-sm font-normal text-muted-foreground">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      <ErrorText id={`${name}-error`}>{error}</ErrorText>
    </fieldset>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>{children}</section>;
}
