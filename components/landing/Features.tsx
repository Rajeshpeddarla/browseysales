"use client";
import { motion } from "framer-motion";
import { FileText, Cpu, Users, Mail, Plug, BookOpen, BarChart3, Download } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Instant Prospect Briefs",
    description: "Visit any company website and get a complete sales-ready brief in under 8 seconds. Company summary, industry, size, and headquarters — all automated.",
  },
  {
    icon: Cpu,
    title: "AI-Powered Tech Stack Detection",
    description: "BuiltWith-style tech stack identification for 1500+ technologies. Know exactly what tools your prospects use before the first call.",
  },
  {
    icon: Users,
    title: "Decision-Maker Enrichment",
    description: "Top 5 contacts with job title, seniority level, department, and LinkedIn profile. Never waste time hunting for the right person again.",
  },
  {
    icon: Mail,
    title: "Personalized Outreach Drafts",
    description: "3-channel outreach: email, LinkedIn DM, and cold call openers — all personalized to the company's recent signals and pain points.",
  },
  {
    icon: Plug,
    title: "One-Click CRM Push",
    description: "Push contacts, companies, notes, and activities to HubSpot, Salesforce, or Pipedrive in a single click. Zero copy-pasting.",
  },
  {
    icon: BookOpen,
    title: "Team Playbooks",
    description: "Sales managers create standardized research templates. Every rep follows the same ICP-fit scoring rubric and outreach tone.",
  },
  {
    icon: BarChart3,
    title: "Team Analytics",
    description: "Track brief counts, CRM push rates, top performers, and reply rates. See which prospects are researched but not pushed to CRM.",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "Export prospect briefs to CSV, Excel, or DOCX. Perfect for team reviews, pipeline meetings, and client deliverables.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:32px_32px] opacity-20" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full border border-brand-violet/30 bg-brand-gradient-soft px-3 py-1 text-xs font-medium text-brand-glow">
            Features
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Everything reps need.{" "}
            <span className="gradient-text">Nothing they don&apos;t.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-text-muted">
            Replace fragmented prospecting, research, and AI tools with a single
            side-drawer that lives where you already work.
          </p>
        </div>

        <motion.div
          className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-6 transition-all hover:border-brand-violet/40 hover:shadow-glow/20"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30 transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-text">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {f.description}
              </p>
              {/* Hover glow */}
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-brand-violet/10 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
