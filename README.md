# Shop Khata 🏪

**Your shop's daily khata, finally organized.**

Shop Khata is engineered as a production-grade full-stack web application, combining modern web technologies, thoughtful UX design, real-time data architecture, and scalable component patterns to deliver a premium daily accounting experience — built specifically for everyday shopkeepers.

---

## ⚡ Technology & Engineering

Shop Khata is built as a production-grade full-stack application, combining a modern React framework, a secure real-time backend, and a carefully considered design system to deliver a fast, private, and dependable daily accounting tool.

### 🚀 Core Technologies

| Category | Technologies |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| **Backend & Database** | Supabase (PostgreSQL, Row Level Security, Auth) |
| **Styling & Design System** | Tailwind CSS 4, Custom Design Tokens, CSS Keyframe Animations |
| **Data Visualization** | Recharts — responsive bar charts, live-updating stats |
| **Icons & Assets** | Lucide React, Next.js Image Optimization |
| **Development Environment** | Node.js, npm, Git, GitHub, VS Code, ESLint |
| **Deployment** | Vercel, Continuous Deployment (CI/CD Ready) |

---

## 🎨 User Experience Engineering

Designed with a strong focus on clarity, trust, and effortless daily use — built for shopkeepers, not accountants.

### Highlights

- 🧾 **Instant Daily Receipts** — Opening, expenses, closing, and Net Cash calculated live
- 💜 **Color-Coded Payment Breakdown** — Cash, JazzCash, EasyPaisa, and Bank Account each get their own accent color
- 📊 **Interactive History & Stats** — Custom date-range filtering across four selectable metrics, each with its own theme
- 🎯 **Autocomplete-Driven Data Entry** — Smart name suggestions prevent duplicate or messy records
- ✨ **Scroll-Triggered Animations** — Content reveals smoothly as the landing page is explored
- 🔐 **Private by Design** — Every shopkeeper's data is fully isolated via Supabase Row Level Security
- 📱 **Mobile-First Layout** — Built for the phone in a shopkeeper's pocket, not just the desktop
- 🎬 **Cinematic Micro-interactions** — Staggered reveals, soft glows, and premium button states throughout

---

## 🏗️ Software Architecture

The application follows a modular, scalable architecture built for long-term maintainability.

### Architecture Principles

- Component-Driven Development
- Server & Client Component Separation (Next.js App Router)
- Reusable UI Primitives (`SectionCard`, `StatCard`, `Modal`, `EmptyState`)
- Centralized Calculation Layer (`lib/calc.ts`)
- Row-Level-Secured Multi-Tenant Data Model
- Scalable Folder Structure by Feature (`/dashboard/today`, `/history`, `/kameeti`, `/inventory`)
- Consistent Design Token System (CSS variables, Tailwind theme)
- Clean Separation of Concerns Between UI, Data, and Business Logic

---

## ⚙️ Frontend Engineering

Built with modern engineering principles to deliver a fast, dependable, real-money-handling experience.

### Engineering Features

- Server-Side Auth Guarding on Every Dashboard Route
- Optimized Client/Server Component Boundaries
- Real-Time Supabase Queries with Scoped RLS Policies
- Efficient React State Management (hooks-first, no unnecessary libraries)
- GPU-Friendly CSS Transitions & Keyframes
- Responsive Layout System (Tailwind breakpoints)
- Accessible, Reduced-Motion-Aware Animations
- Semantic HTML5 & Clean Component Composition
- Type-Safe Data Models End-to-End (TypeScript + Supabase types)

---

## 📱 Responsive Experience

Carefully crafted for every device a shopkeeper actually uses — not just scaled down.

### Optimized for:

- 💻 Desktop
- 💼 Laptop
- 📱 Tablet
- 📲 Mobile Devices (primary use case)

Every screen — from the landing page to the daily receipt — has been individually refined for readability, tap-target comfort, and safe-area awareness on modern phones.

---

## 🎬 Motion Design

Every animation exists to support clarity and confidence in the numbers — never to distract from them.

### Includes:

- Staggered Section Reveals on Scroll
- Smooth Fade/Slide Transitions Between States
- Animated Receipt Line-by-Line Breakdown
- Soft Glow & Highlight Effects on Key Figures
- Premium Button Hover & Active States
- Reduced-Motion Support Throughout

---

## 🌟 Design Philosophy

Rather than treating daily bookkeeping as a chore, Shop Khata treats it as a small daily ritual — open the shop, log the small stuff, close and see the profit.

"**Khata**" — the traditional ledger every shopkeeper already keeps — is reimagined here as something fast, clear, and genuinely pleasant to use, without losing the trust and simplicity that made the paper version work in the first place.

The objective isn't just to digitize a ledger, but to demonstrate thoughtful product engineering: real numbers, real trust, and real usability, built for the person actually standing behind the counter.

---

## 📈 Engineering Goals

- Deliver a trustworthy, accurate financial tool
- Maintain instant, real-time calculation feedback
- Build reusable, scalable UI components
- Keep every shopkeeper's data completely private
- Balance a premium feel with everyday simplicity
- Prioritize mobile usability above all else
- Demonstrate modern full-stack engineering practices
- Showcase product thinking through real-world utility

---

## 💡 Built With

**Curiosity. Patience. Iteration. Precision.**

Every calculation, animation, and interaction has been refined through continuous testing — with the goal of creating a tool that feels instant, trustworthy, and effortless for the person using it every single day.

---

**Made for shopkeepers, by SAK Council.**
