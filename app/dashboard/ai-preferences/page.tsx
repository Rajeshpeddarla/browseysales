"use client";
import { useState } from "react";
import {
  Sparkles,
  Languages,
  Quote,
  Wand2,
  GaugeCircle,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const tones = ["Neutral", "Friendly", "Concise", "Academic", "Caveman", "Playful"];
const lengths = ["Short", "Standard", "Deep", "Comprehensive"];
const styles = ["Bulleted", "Paragraph", "Q&A", "Outline"];
const modes = ["Chat", "Summary", "Research", "Tutor"];

export default function AIPreferencesPage() {
  const [tone, setTone] = useState("Concise");
  const [length, setLength] = useState("Standard");
  const [style, setStyle] = useState("Bulleted");
  const [mode, setMode] = useState("Chat");

  return (
    <>
      <DashTopBar title="AI preferences" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          AI preferences
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Tune Browsey to match how you think and write.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface-1 p-6 lg:col-span-2">
            <Section
              icon={Quote}
              title="Tone"
              desc="The voice Browsey uses in responses."
            >
              <Chips options={tones} value={tone} onChange={setTone} />
            </Section>

            <Section
              icon={GaugeCircle}
              title="Response length"
              desc="Default summary and answer depth."
            >
              <Chips options={lengths} value={length} onChange={setLength} />
            </Section>

            <Section
              icon={Wand2}
              title="Format style"
              desc="How structured the output should be."
            >
              <Chips options={styles} value={style} onChange={setStyle} />
            </Section>

            <Section
              icon={Sparkles}
              title="Default mode"
              desc="The sidebar will open in this mode by default."
            >
              <Chips options={modes} value={mode} onChange={setMode} />
            </Section>

            <Section
              icon={Languages}
              title="Language"
              desc="Browsey will respond in this language."
            >
              <select className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:border-brand-violet/60">
                {[
                  "English",
                  "हिन्दी",
                  "Español",
                  "Français",
                  "Deutsch",
                  "日本語",
                  "中文",
                ].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Section>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary">Reset to defaults</Button>
              <Button>Save preferences</Button>
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-brand-violet/30 bg-surface-1 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-glow">
                Preview
              </p>
              <h3 className="mt-2 text-base font-semibold text-text">
                How Browsey will sound
              </h3>
              <div className="mt-4 rounded-xl border border-border-soft bg-bg-soft p-4 text-sm text-text">
                <p className="text-xs text-text-subtle">User</p>
                <p className="mt-1">Summarize this article.</p>
                <p className="mt-4 text-xs text-text-subtle">Browsey</p>
                <ul className="mt-1 space-y-1.5 text-text-muted">
                  <li>• Apple ships Metal-3 backend for MLX.</li>
                  <li>• Inference latency cut by 38%.</li>
                  <li>• Native on-device LLMs launch with macOS 16.</li>
                </ul>
              </div>
              <p className="mt-4 text-xs text-text-muted">
                Settings: <span className="text-text">{tone}</span>,{" "}
                <span className="text-text">{length.toLowerCase()}</span>,{" "}
                <span className="text-text">{style.toLowerCase()}</span>.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-soft py-5 first:pt-0">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-text">{title}</p>
          {desc && <p className="text-xs text-text-muted">{desc}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs transition-all",
            value === o
              ? "border-brand-violet/40 bg-brand-gradient-soft text-text"
              : "border-border-soft text-text-muted hover:text-text"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
