import Link from "next/link";
import { LogoWordmark } from "./Logo";
import { SidebarPreview } from "./landing/SidebarPreview";
import { UserTypesMarquee } from "./landing/UserTypesMarquee";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative flex flex-col px-6 py-8 sm:px-10 lg:px-16">
        <Link href="/" className="inline-flex">
          <LogoWordmark />
        </Link>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm text-text-muted">{subtitle}</p>
            )}
            <div className="mt-8">{children}</div>
            {footer && (
              <div className="mt-6 text-sm text-text-muted">{footer}</div>
            )}
          </div>
        </div>

        <p className="text-xs text-text-subtle">
          © {new Date().getFullYear()} Browsey, Inc.
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-border-soft bg-bg-soft lg:flex">
        <div className="absolute inset-0 -z-10 bg-radial-fade" />
        <div className="absolute inset-0 -z-10 bg-grid bg-grid opacity-25 [mask-image:radial-gradient(50%_50%_at_50%_40%,black,transparent)]" />
        <div className="m-auto w-full max-w-xl px-10">
          <SidebarPreview />
          
          <div className="mt-12 flex flex-col items-center gap-6">
            <UserTypesMarquee />
            <div className="text-center">
              <p className="text-sm font-medium text-text">
                The AI sidebar that reads with you.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Open any webpage. Ask anything. No copy-paste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
