import * as React from "react";
import { cn } from "@/lib/cn";

export function Input({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text placeholder:text-text-subtle outline-none transition focus:border-brand-violet/60 focus:ring-2 focus:ring-brand-violet/30",
        className
      )}
    />
  );
}

export function Label({
  className,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...rest}
      className={cn(
        "mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted",
        className
      )}
    />
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-subtle outline-none transition focus:border-brand-violet/60 focus:ring-2 focus:ring-brand-violet/30",
        className
      )}
    />
  );
}
