import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { QuickSearchTeaser } from "@/components/landing/QuickSearchTeaser";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Real-time AQI",
    description: "Live readings for any city, sourced from the World Air Quality Index network.",
  },
  {
    title: "Personal risk analysis",
    description: "Guidance tuned to your health profile — asthma, COPD, pregnancy, and more.",
  },
  {
    title: "Saved locations",
    description: "Track home, work, and family at a glance from one dashboard.",
  },
  {
    title: "Historical trends",
    description: "See how air quality has moved over the last 7 or 30 days.",
  },
  {
    title: "Smart alerts",
    description: "Get notified the moment air quality crosses your threshold.",
  },
  {
    title: "Community reports",
    description: "Real people flagging smoke, burning, and industrial emissions nearby.",
  },
];

const steps = [
  {
    title: "Search a location",
    description: "Look up any city, or use where you are right now.",
  },
  {
    title: "Read the risk",
    description: "See a breakdown built around your own health profile.",
  },
  {
    title: "Take action",
    description: "Follow specific guidance on masks, exercise, and ventilation.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-[family-name:var(--font-display)] text-lg italic">BreatheSafe</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants())}>
            Get started
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Air quality, made personal
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-balance sm:text-6xl">
              Know what
              <br />
              you&apos;re <em className="italic text-primary">breathing</em>.
            </h1>
            <p className="mt-6 max-w-md text-balance text-muted-foreground">
              BreatheSafe turns a raw pollution number into guidance you can actually
              act on today — for you, specifically, not the average person outside.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                Get started
              </Link>
              <a
                href="#quick-search"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Check the air
              </a>
            </div>
          </div>

          <div id="quick-search" className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Try it now, no account needed
            </p>
            <QuickSearchTeaser />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Everything you need to breathe easier
            </h2>
            <dl className="mt-8 divide-y divide-border border-t border-border">
              {features.map((f) => (
                <div key={f.title} className="grid gap-1 py-5 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <dt className="font-medium">{f.title}</dt>
                  <dd className="text-sm text-muted-foreground">{f.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">How it works</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title}>
                  <span className="font-[family-name:var(--font-display)] text-3xl italic text-primary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-medium">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>&copy; {new Date().getFullYear()} BreatheSafe</span>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
