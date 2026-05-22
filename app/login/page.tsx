"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { GoogleButton } from "@/components/GoogleButton";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Browsey account to continue."
      footer={
        <span>
          Don&apos;t have an account?{" "}
          <Link className="text-brand-glow hover:underline" href="/signup">
            Create one
          </Link>
        </span>
      }
    >
      <GoogleButton label="Continue with Google" />

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
        <div suppressHydrationWarning>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-brand-glow hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border bg-surface accent-brand-violet"
          />
          Remember this device for 30 days
        </label>
        <Button size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-border bg-surface-1 p-3 text-xs text-text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-glow" />
        Protected by Argon2 password hashing, rotating refresh tokens, and
        device fingerprinting.
      </div>
    </AuthShell>
  );
}
