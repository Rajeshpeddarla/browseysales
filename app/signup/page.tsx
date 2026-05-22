"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { GoogleButton } from "@/components/GoogleButton";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { signup } from "@/app/actions/auth";

const checks = [
  "Free 20 AI requests / day",
  "Works on every webpage you open",
  "Cancel any time — no credit card",
];

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Browsey is free to start. No credit card required."
      footer={
        <span>
          Already have an account?{" "}
          <Link className="text-brand-glow hover:underline" href="/login">
            Sign in
          </Link>
        </span>
      }
    >
      <GoogleButton label="Sign up with Google" />

      <div className="my-6 flex items-center gap-3 text-xs text-text-subtle">
        <div className="h-px flex-1 bg-border-soft" />
        <span>or with email</span>
        <div className="h-px flex-1 bg-border-soft" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-xs text-danger">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first">First name</Label>
            <Input id="first" name="first" placeholder="Alex" required />
          </div>
          <div>
            <Label htmlFor="last">Last name</Label>
            <Input id="last" name="last" placeholder="Doe" required />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@company.com" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 12 characters"
            required
            minLength={12}
          />
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            <span className="h-1 rounded-full bg-brand-violet" />
            <span className="h-1 rounded-full bg-brand-violet" />
            <span className="h-1 rounded-full bg-brand-pink" />
            <span className="h-1 rounded-full bg-surface-3" />
          </div>
          <p className="mt-1.5 text-[11px] text-text-subtle">
            Strong — letters, numbers and a symbol recommended.
          </p>
        </div>

        <label className="flex items-start gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-border bg-surface accent-brand-violet"
          />
          I agree to the{" "}
          <Link href="#" className="text-brand-glow hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="text-brand-glow hover:underline">
            Privacy Policy
          </Link>
          .
        </label>

        <Button size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <ul className="mt-6 space-y-2">
        {checks.map((c) => (
          <li key={c} className="flex items-center gap-2 text-xs text-text-muted">
            <CheckCircle2 className="h-4 w-4 text-success" />
            {c}
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}
