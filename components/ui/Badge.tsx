import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "brand" | "success" | "warning" | "danger" | "outline";

const tones: Record<Tone, string> = {
  default: "bg-surface-2 text-text-muted border border-border",
  brand:
    "bg-brand-gradient-soft text-brand-glow border border-brand-violet/40",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  danger: "bg-danger/15 text-danger border border-danger/30",
  outline: "border border-border text-text-muted",
};

export function Badge({
  className,
  tone = "default",
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
