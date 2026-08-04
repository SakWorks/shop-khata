import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Reveal from "@/components/Reveal";
import {
  Store,
  TrendingUp,
  Boxes,
  PiggyBank,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  BarChart3,
} from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-ink overflow-x-hidden">
      {/* Nav */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Store size={16} color="white" />
          </div>
          <span className="font-display font-semibold text-[17px]">Shop Khata</span>
        </div>
        <Link href="/login" className="btn-secondary">
          Log in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <div
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--primary-soft), transparent)" }}
        />
        <div
          className="pointer-events-none absolute top-32 right-0 w-[360px] h-[360px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--gold-soft), transparent)" }}
        />

        <div className="relative animate-fade-in-up">
          <span className="inline-block text-[12.5px] font-semibold tracking-wide uppercase text-gold bg-gold-soft px-3 py-1.5 rounded-full mb-6">
            Built for everyday shopkeepers
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.15] max-w-3xl mx-auto">
            Your shop&apos;s daily khata,
            <br />
            finally organized.
          </h1>
          <p className="text-ink-soft text-base md:text-lg mt-5 max-w-xl mx-auto leading-relaxed">
            Track opening and closing cash, daily expenses, inventory, and monthly
            savings — all in one place, private to your shop alone.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
            <Link href="/login" className="btn-primary text-[14px] px-6 py-3 flex items-center gap-2">
              Get started free <ArrowRight size={16} />
            </Link>
            <a href="#features" className="btn-secondary text-[14px] px-6 py-3">
              See how it works
            </a>
          </div>
          <p className="text-[12.5px] text-ink-soft mt-4">
            No credit card. No installation — works right in your browser.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-24">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
            Everything a shop&apos;s daily accounts need
          </h2>
          <p className="text-ink-soft mt-2 max-w-lg mx-auto">
            No spreadsheets, no confusing menus — just what a shopkeeper actually
            needs, every single day.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: TrendingUp,
              title: "Today's Sales & Profit",
              desc: "Enter opening and closing cash — gross sales and net profit are calculated for you, instantly.",
              tone: "primary" as const,
            },
            {
              icon: BarChart3,
              title: "History & Trends",
              desc: "See the last 10 days or any full month at a glance, with a clear chart of daily profit.",
              tone: "gold" as const,
            },
            {
              icon: Boxes,
              title: "Inventory & Profit",
              desc: "Log purchases, mark items sold, and see exactly how much profit each batch of stock made.",
              tone: "success" as const,
            },
            {
              icon: PiggyBank,
              title: "Monthly Savings",
              desc: "Rent, bills, and daily expenses roll up automatically into one honest savings number.",
              tone: "primary" as const,
            },
            {
              icon: ShieldCheck,
              title: "Private to Your Shop",
              desc: "Every shopkeeper's data is kept completely separate — no one else can ever see your numbers.",
              tone: "gold" as const,
            },
            {
              icon: Smartphone,
              title: "Works on Any Phone",
              desc: "No app to install. Open it in any browser, on desktop or mobile, and it just works.",
              tone: "success" as const,
            },
          ].map(({ icon: Icon, title, desc, tone }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="card p-6 h-full">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    tone === "primary"
                      ? "bg-primary-soft text-primary"
                      : tone === "gold"
                      ? "bg-gold-soft text-gold"
                      : "bg-success-soft text-success"
                  }`}
                >
                  <Icon size={19} />
                </div>
                <h3 className="font-display font-semibold text-[15.5px] mb-1.5">{title}</h3>
                <p className="text-[13.5px] text-ink-soft leading-relaxed">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="card p-8 md:p-12 bg-surface-alt border-none">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-center mb-10">
              Three steps, every day
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Open your shop", desc: "Enter the cash in your drawer, with the time." },
                { step: "2", title: "Log the small stuff", desc: "Tea, lunch, a quick expense — add it in seconds." },
                { step: "3", title: "Close and see today's profit", desc: "Enter closing cash — your gross sales and profit appear instantly." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center md:text-left">
                  <div className="w-9 h-9 rounded-full bg-primary text-white font-display font-semibold flex items-center justify-center mx-auto md:mx-0 mb-4">
                    {step}
                  </div>
                  <h3 className="font-semibold text-[15px] mb-1.5">{title}</h3>
                  <p className="text-[13.5px] text-ink-soft leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-3">
            Start keeping your khata the easy way
          </h2>
          <p className="text-ink-soft mb-7">Free to use. Set up your shop in under two minutes.</p>
          <Link href="/login" className="btn-primary text-[14px] px-7 py-3 inline-flex items-center gap-2">
            Get started free <ArrowRight size={16} />
          </Link>
        </section>
      </Reveal>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12.5px] text-ink-soft">
          <span>Smart Account, Better Future.</span>
          <div className="flex items-center gap-2 bg-primary-soft text-primary px-4 py-2 rounded-full font-medium">
            <span>© {year} Shop Khata</span>
            <span className="opacity-40">•</span>
            <span>Made by SAK Council</span>
          </div>
        </div>
      </footer>

      {/* Mobile-only copyright badge — visible immediately on app open, no scrolling needed */}
      <div className="sm:hidden fixed bottom-3 right-3 z-50">
        <div className="flex items-center gap-1.5 bg-primary-soft text-primary text-[10.5px] font-medium px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm">
          <span>© {year} Shop Khata</span>
          <span className="opacity-40">•</span>
          <span>SAK Council</span>
        </div>
      </div>
    </div>
  );
}