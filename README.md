# Browsey — Website

Next.js 15 (App Router) + Tailwind + TypeScript. Dark theme matching the Browsey brand (blue → violet → pink gradient on near-black navy).

This is the marketing site + authenticated dashboard for Browsey, the AI browser assistant. Pure UI scaffold — Supabase, Stripe and AI endpoints are stubbed via `.env.example`.

## Stack

- Next.js 15 (App Router, React 19, Server Components)
- TypeScript (strict)
- Tailwind CSS 3
- framer-motion (lightweight animations)
- lucide-react (icons)

## Quick start

```bash
cd website
npm install
cp .env.example .env.local   # leave blank for now — UI works without creds
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available routes

### Public

| Path | Purpose |
|---|---|
| `/` | Landing page (hero + sidebar preview + features + demo + security + testimonials + pricing + FAQ + CTA) |
| `/pricing` | Pricing + side-by-side comparison + FAQ |
| `/login` | Email + Google login |
| `/signup` | Email + Google signup with onboarding hooks |
| `/forgot-password` | Reset-link request |
| `/verify-email` | 6-digit OTP verify |
| `/download` | Extension install steps + browser support + permissions |

### Dashboard (`/dashboard/*`)

| Path | Purpose |
|---|---|
| `/dashboard` | Home — usage, activity, sites, quick actions |
| `/dashboard/history` | Searchable history with filters + export |
| `/dashboard/saved` | Folders, tags, saved summary cards |
| `/dashboard/research` | Multi-tab AI research workspace |
| `/dashboard/subscription` | Plan, usage, billing, invoices |
| `/dashboard/settings` | Profile, notifications, theme, privacy tabs |
| `/dashboard/security` | Password, devices, 2FA, login activity |
| `/dashboard/ai-preferences` | Tone, length, format, default mode, language |
| `/dashboard/support` | Docs, community, contact form, FAQs |

## Design tokens

Defined in `tailwind.config.ts`:

- **Background**: `#07071A` (deep navy-black)
- **Surfaces**: `#10102B → #22224E`
- **Brand gradient**: `#5B8BFF → #7C5BFF → #D966FF`
- **Glow accent**: `#B19CFF`

Use `bg-brand-gradient`, `gradient-text`, `shadow-glow`, `gradient-border` and `glass` utility classes throughout.

## Project structure

```
website/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                # landing
│   ├── login/  signup/  ...    # auth pages
│   ├── pricing/  download/     # public pages
│   └── dashboard/              # authenticated pages
├── components/
│   ├── Logo.tsx
│   ├── SiteNav.tsx  SiteFooter.tsx
│   ├── AuthShell.tsx
│   ├── Section.tsx
│   ├── ui/        # Button, Card, Input, Badge
│   ├── landing/   # Hero, Features, Demo, Security, FAQ, ...
│   └── dashboard/ # Sidebar, TopBar
├── lib/cn.ts
├── public/logo.png
├── tailwind.config.ts
└── app/globals.css
```

## What's stubbed

All data on dashboard pages is hardcoded for now. Supabase Auth, Stripe billing and the AI streaming endpoints are not wired up yet — the env vars live in `.env.example` and the matching API routes can be added under `app/api/*`.

## Next steps

1. `npm install`, run `npm run dev`, click through every route.
2. Wire Supabase Auth (Google + email/password) into the auth pages.
3. Plug Stripe Checkout into `/dashboard/subscription`.
4. Stream Gemma 3n E4B responses through `app/api/chat/route.ts`.
5. Replace dashboard mock data with real Supabase queries.

## Notes

- The hero sidebar preview is a fully self-contained component (`components/landing/SidebarPreview.tsx`) — drop it anywhere.
- The dashboard sidebar highlights the active route automatically using `usePathname`.
- Brand colors come directly from `assets/logo.png` (copied to `public/logo.png`).
