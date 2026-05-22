import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Mail } from "lucide-react";

export const metadata = { title: "Reset password · Browsey" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email tied to your account. We'll send you a secure reset link."
      footer={
        <span>
          Remembered it?{" "}
          <Link className="text-brand-glow hover:underline" href="/login">
            Back to sign in
          </Link>
        </span>
      }
    >
      <form className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" />
        </div>
        <Button size="lg" className="w-full">
          Send reset link
        </Button>
      </form>

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-border bg-surface-1 p-4 text-xs text-text-muted">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-glow" />
        Reset links expire after 15 minutes and can only be used once. If you
        didn&apos;t request a reset, you can safely ignore the email.
      </div>
    </AuthShell>
  );
}
