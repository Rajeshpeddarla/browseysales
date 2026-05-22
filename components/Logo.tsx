import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      aria-label="Browsey"
    >
      <defs>
        <linearGradient id="bx-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B8BFF" />
          <stop offset="50%" stopColor="#7C5BFF" />
          <stop offset="100%" stopColor="#D966FF" />
        </linearGradient>
      </defs>
      <path
        d="M18 8h12c8 0 14 5 14 12 0 4-2 7-5 9 5 2 8 6 8 12 0 8-6 15-16 15H18V8zm10 22c4 0 6-2 6-5s-2-5-6-5h-3v10h3zm1 22c5 0 8-3 8-7s-3-7-8-7h-4v14h4z"
        fill="url(#bx-grad)"
      />
      <path
        d="M32 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"
        fill="#fff"
        opacity="0.95"
      />
    </svg>
  );
}

export function LogoWordmark({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <div className="flex flex-col leading-none">
        <span className="text-xl font-semibold tracking-tight text-text">
          Browsey
        </span>
        {showTagline && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.18em] gradient-text">
            AI that understands the web
          </span>
        )}
      </div>
    </div>
  );
}
