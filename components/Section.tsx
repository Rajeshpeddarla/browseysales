import * as React from "react";
import { cn } from "@/lib/cn";

export function Section({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8",
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand-gradient animate-pulseGlow" />
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center"
      )}
    >
      {eyebrow && <SectionEyebrow className="mb-5">{eyebrow}</SectionEyebrow>}
      <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-text sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-base text-text-muted sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
