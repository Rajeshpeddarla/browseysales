"use client";

import { useState } from "react";
import { askBrowsey } from "@/app/actions/ai";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";

export default function TestAIPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    const result = await askBrowsey(question, "");
    if (result.success) {
      setAnswer(result.answer || "No response generated.");
    } else {
      setAnswer(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <SiteNav />
      <main className="max-w-2xl mx-auto pt-32 px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-brand-gradient">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Test Browsey AI</h1>
        </div>

        <div className="p-6 rounded-2xl border border-border bg-surface-1 shadow-card">
          <form onSubmit={handleAsk} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-muted mb-2 block">
                Ask anything (powered by NVIDIA Gemma 3)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How does vector search work?"
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-violet/50 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 p-2 rounded-lg bg-brand-gradient text-white disabled:opacity-50 transition-opacity"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </form>

          {answer && (
            <div className="mt-8 p-5 rounded-xl bg-brand-gradient-soft border border-brand-violet/20 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm font-medium text-brand-violet mb-2">Browsey says:</p>
              <div className="text-text leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-text-subtle">
          This test page uses NVIDIA NIM and Supabase for logging.
        </p>
      </main>
    </div>
  );
}
