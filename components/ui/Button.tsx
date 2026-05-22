"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-glow hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface-2 text-text border border-border hover:bg-surface-3",
  ghost: "text-text hover:bg-surface-2",
  outline:
    "border border-border-strong text-text hover:bg-surface-2 hover:border-brand-violet/60",
  danger: "bg-danger/90 text-white hover:bg-danger",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "primary",
    size = "md",
    className,
    leftIcon,
    rightIcon,
    children,
    ...rest
  } = props;

  const cls = cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-all select-none whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-violet/60",
    variants[variant],
    sizes[size],
    className
  );

  const inner = (
    <>
      {leftIcon && <span className="-ml-0.5">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="-mr-0.5">{rightIcon}</span>}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        className={cls}
        {...(rest as any)}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      className={cls}
    >
      {inner}
    </button>
  );
}
