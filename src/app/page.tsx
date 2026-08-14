import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { QuickSearchTeaser } from "@/components/landing/QuickSearchTeaser";
import { AqiScale } from "@/components/aqi/AqiScale";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { TextReveal } from "@/components/motion/TextReveal";

const features = [
  {
    n: "01",
    title: "Real-time AQI",
    description: "Live readings for any city, sourced from the World Air Quality Index network.",
  },
  {
    n: "02",
    title: "Personal risk analysis",
    description: "Guidance tuned to your health profile  asthma, COPD, pregnancy, and more.",
  },
  {
    n: "03",
    title: "Saved locations",
    description: "Track home, work, and family at a glance from one dashboard.",
  },
  {
    n: "04",
    title: "Historical trends",
    description: "See how air quality has moved over the last 7 or 30 days.",
  },
  {
    n: "05",
    title: "Smart alerts",
    description: "Get notified the moment air quality crosses your threshold.",
  },
  {
    n: "06",
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
        <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          BreatheSafe
        </span>
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
        {/* Hero  editorial serif, line-by-line reveal, generous air */}
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Air quality, made personal
            </p>
          </Reveal>

          <TextReveal
            delay={0.1}
            className="mt-6"
            lineClassName="font-[family-name:var(--font-editorial)] text-6xl italic leading-[1.05] tracking-tight text-balance sm:text-7xl lg:text-8xl"
            lines={["Know what", "you're breathing."]}
          />

          <Reveal delay={0.5} className="mt-8 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="max-w-md text-balance text-lg text-muted-foreground">
                A raw pollution number, turned into guidance you can actually act on
                today  for you, specifically, not the average person outside.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Magnetic>
                  <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                    Get started
                  </Link>
                </Magnetic>
                <Magnetic>
                  <a
                    href="#quick-search"
                    className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
                  >
                    Check the air
                  </a>
                </Magnetic>
              </div>
            </div>

            <div className="w-full max-w-xs shrink-0 rounded-sm border border-border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Six bands, one reading
                </span>
                <span className="font-[family-name:var(--font-display)] text-sm font-bold tabular-nums">
                  118
                </span>
              </div>
              <AqiScale aqi={118} className="mt-3" />
              <p className="mt-3 text-xs text-muted-foreground">
                Every reading ships with the neighbouring bands  not just a colour, the
                whole scale.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Quick search  its own quiet moment, not squeezed beside the hero */}
        <section id="quick-search" className="border-t border-border bg-secondary/40">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Try it now  no account needed
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-editorial)] text-3xl italic">
                Check the air where you are.
              </h2>
            </Reveal>
            <Reveal delay={0.15} className="mx-auto mt-8 max-w-md text-left">
              <QuickSearchTeaser />
            </Reveal>
          </div>
        </section>

        {/* Features  numbered rows, each underline draws in as it enters view */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
            <Reveal>
              <h2 className="font-[family-name:var(--font-editorial)] text-3xl italic tracking-tight sm:text-4xl">
                Everything you need to breathe easier
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.05}>
                  <div className="group border-t border-border pt-4">
                    <div className="flex items-baseline justify-between">
                      <span className="font-[family-name:var(--font-display)] text-xs tabular-nums text-muted-foreground">
                        {f.n}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-medium">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                    <div className="relative mt-4 h-px bg-border">
                      <div className="absolute inset-y-0 left-0 w-0 bg-[#22c55e] transition-[width] duration-700 ease-out group-hover:w-full" />
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works  a spine that draws top to bottom as you scroll */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
            <Reveal>
              <h2 className="font-[family-name:var(--font-editorial)] text-3xl italic tracking-tight sm:text-4xl">
                How it works
              </h2>
            </Reveal>
            <Reveal stagger className="mt-12 grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title} className="relative border-l-2 border-[#22c55e]/25 pl-5">
                  <span
                    aria-hidden
                    className="absolute top-0 -left-[5px] h-2 w-2 rounded-full bg-[#22c55e]"
                  />
                  <span className="font-[family-name:var(--font-display)] text-xs tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-1 font-medium">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </Reveal>
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
