import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link
          href="/"
          className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
        >
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          BreatheSafe
        </Link>
        <Reveal className="space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-tight tracking-tight text-balance">
            Breathe smarter.
            <br />
            Live safer.
          </h1>
          <p className="max-w-md text-sm text-primary-foreground/75">
            Real-time air quality, personalized health guidance, and smart alerts — your personal
            air quality guardian.
          </p>
        </Reveal>
        <p className="text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} BreatheSafe
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
