import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Mail, RefreshCw } from "lucide-react";

export const metadata = { title: "Verify email · Browsey" };

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Verify your email"
      subtitle="We just sent a 6-digit code to you@company.com. Enter it below to activate your account."
      footer={
        <span>
          Wrong address?{" "}
          <Link className="text-brand-glow hover:underline" href="/signup">
            Change email
          </Link>
        </span>
      }
    >
      <div className="flex justify-center gap-2.5">
        {[..."123456"].map((_, i) => (
          <input
            key={i}
            inputMode="numeric"
            maxLength={1}
            className="h-14 w-12 rounded-xl border border-border bg-surface text-center text-2xl font-semibold tracking-widest text-text outline-none focus:border-brand-violet/60 focus:ring-2 focus:ring-brand-violet/30"
          />
        ))}
      </div>

      <Button size="lg" className="mt-7 w-full">
        Verify and continue
      </Button>

      <div className="mt-6 flex items-center justify-between text-xs text-text-muted">
        <span className="inline-flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" /> Didn&apos;t get it? Check spam.
        </span>
        <button className="inline-flex items-center gap-1.5 text-brand-glow hover:underline">
          <RefreshCw className="h-3.5 w-3.5" /> Resend code
        </button>
      </div>
    </AuthShell>
  );
}
