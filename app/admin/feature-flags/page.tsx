"use client";

import { useEffect, useState } from "react";
import { ToggleRight, Loader2, Save, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key");
      setFlags(data || []);
      setLoading(false);
    })();
  }, []);

  const updateFlag = async (key: string, value: string) => {
    const supabase = createClient();
    try {
      const parsedValue = JSON.parse(value);
      await supabase
        .from("feature_flags")
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq("key", key);
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, value: parsedValue } : f))
      );
    } catch {
      alert("Invalid JSON value");
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text">Feature Flags</h1>
      <p className="mt-1 text-sm text-text-muted">Remote configuration for the platform.</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-glow" />
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {flags.map((f) => (
            <div key={f.key} className="rounded-2xl border border-border bg-surface-1 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ToggleRight className="h-4 w-4 text-brand-glow" />
                    <h3 className="text-sm font-semibold font-mono text-text">{f.key}</h3>
                  </div>
                  {f.description && (
                    <p className="mt-1 text-xs text-text-muted">{f.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={JSON.stringify(f.value)}
                    onBlur={(e) => updateFlag(f.key, e.target.value)}
                    className="w-48 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-mono text-text focus:border-brand-violet/60 focus:outline-none"
                  />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-text-subtle">
                Last updated: {new Date(f.updated_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
