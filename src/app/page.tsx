import Link from "next/link";
import {
  Activity,
  Bell,
  MapPin,
  TrendingUp,
  Users,
  Wind,
  Search,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { QuickSearchTeaser } from "@/components/landing/QuickSearchTeaser";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Wind,
    title: "Real-time AQI",
    description: "Live air quality readings for any city, powered by the World Air Quality Index network.",
  },
  {
    icon: ShieldCheck,
    title: "Personal Risk Analysis",
    description: "Guidance tailored to your health profile — asthma, COPD, pregnancy, and more.",
  },
  {
    icon: MapPin,
    title: "Saved Locations",
    description: "Track home, work, and family locations at a glance from one dashboard.",
  },
  {
    icon: TrendingUp,
    title: "Historical Trends",
    description: "See how air quality has changed over the last 7 or 30 days.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Get notified the moment air quality crosses your personal threshold.",
  },
  {
    icon: Users,
    title: "Community Reports",
    description: "Real people reporting smoke, burning, and industrial emissions nearby.",
  },
];

const steps = [
  {
    icon: Search,
    title: "Search Location",
    description: "Look up any city or use your current location.",
  },
  {
    icon: ClipboardCheck,
    title: "Get Risk Analysis",
    description: "See a personalized breakdown based on your health profile.",
  },
  {
    icon: Activity,
    title: "Take Action",
    description: "Follow tailored guidance on masks, exercise, and ventilation.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white dark:from-slate-950 dark:via-background dark:to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold tracking-tight">BreatheSafe</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants())}>
            Get Started
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Know What You&apos;re <span className="text-primary">Breathing</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            BreatheSafe turns raw air quality data into guidance you can actually act on —
            personalized to your health, your family, and your day.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
              Get Started
            </Link>
            <a href="#quick-search" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Check Air Quality
            </a>
          </div>

          <div id="quick-search" className="mt-14">
            <QuickSearchTeaser />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to breathe easier</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-secondary/40 py-16">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-primary">STEP {i + 1}</p>
                  <h3 className="mt-1 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
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
