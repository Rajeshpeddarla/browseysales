import * as React from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  hoverable = false,
  glow = false,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-2xl border border-border bg-surface-1/80 backdrop-blur-sm shadow-card",
        hoverable &&
          "transition-all hover:border-brand-violet/40 hover:bg-surface-2",
        glow && "ring-brand",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pb-4", className)} {...rest} />;
}

export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-2", className)} {...rest} />;
}

export function CardTitle({
  className,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-text", className)}
      {...rest}
    />
  );
}

export function CardDescription({
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-text-muted leading-relaxed", className)}
      {...rest}
    />
  );
}
