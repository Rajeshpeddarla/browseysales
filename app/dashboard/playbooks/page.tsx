"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Globe,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/Badge";
import { getPlaybooks, createPlaybook, deletePlaybook } from "@/app/actions/sales";

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    icp_description: "",
    outreach_tone: "professional",
  });

  useEffect(() => {
    loadPlaybooks();
  }, []);

  const loadPlaybooks = async () => {
    setLoading(true);
    const res = await getPlaybooks();
    if (res.ok && res.data) {
      setPlaybooks(res.data);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    const res = await createPlaybook(form);
    if (res.ok) {
      setPlaybooks((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "", icp_description: "", outreach_tone: "professional" });
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this playbook?")) return;
    await deletePlaybook(id);
    setPlaybooks((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <DashTopBar title="Playbooks" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Sales Playbooks 📖
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Standardize how your team researches prospects and generates outreach.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            New Playbook
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text">Create Playbook</h3>
                <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Playbook Name</label>
                  <input
                    type="text"
                    placeholder="e.g., SaaS Q2 ICP Research"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Description</label>
                  <textarea
                    placeholder="What does this playbook help reps achieve?"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">ICP Description</label>
                  <textarea
                    placeholder="Describe the ideal customer profile this playbook targets..."
                    value={form.icp_description}
                    onChange={(e) => setForm((f) => ({ ...f, icp_description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Outreach Tone</label>
                  <select
                    value={form.outreach_tone}
                    onChange={(e) => setForm((f) => ({ ...f, outreach_tone: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text focus:border-brand-violet/60 focus:outline-none"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual / Friendly</option>
                    <option value="bold">Bold / Direct</option>
                    <option value="consultative">Consultative</option>
                    <option value="humorous">Humorous</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-border bg-surface-2 py-2.5 text-sm text-text hover:bg-surface-3 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !form.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-gradient py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Playbook
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Playbooks Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-brand-glow" />
            </div>
          ) : playbooks.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-text-subtle" />
              <h3 className="mt-4 text-lg font-semibold text-text">No playbooks yet</h3>
              <p className="mt-2 text-sm text-text-muted max-w-sm mx-auto">
                Create your first playbook to standardize how your team researches prospects and writes outreach.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" /> Create Playbook
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {playbooks.map((pb) => (
                <div
                  key={pb.id}
                  className="group rounded-2xl border border-border bg-surface-1 p-5 transition-all hover:border-brand-violet/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient-soft text-brand-glow">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button className="rounded-lg p-1.5 text-text-muted hover:bg-surface-2">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pb.id)}
                        className="rounded-lg p-1.5 text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-text">{pb.name}</h3>
                  <p className="mt-1 text-sm text-text-muted line-clamp-2">
                    {pb.description || "No description"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="outline">
                      <MessageSquare className="mr-1 h-3 w-3" />
                      {pb.outreach_tone}
                    </Badge>
                    {pb.is_public && <Badge tone="brand">Public</Badge>}
                  </div>
                  {pb.icp_description && (
                    <div className="mt-3 rounded-lg bg-surface-2 p-2.5">
                      <p className="text-[10px] font-medium uppercase text-text-subtle mb-1">ICP</p>
                      <p className="text-xs text-text-muted line-clamp-2">{pb.icp_description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
